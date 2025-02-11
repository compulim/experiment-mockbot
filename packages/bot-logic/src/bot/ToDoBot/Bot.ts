import { ActivityHandler, type SuggestedActions, type TurnContext } from 'botbuilder';
import random from 'math-random';
import { compareTwoStrings } from 'string-similarity';

type ToDoTask = {
  completed: boolean;
  text: string;
};

const SUGGESTED_ACTIONS: SuggestedActions = {
  to: [],
  actions: [
    {
      title: 'What is on my list?',
      type: 'imBack',
      value: 'What is on my list?'
    },
    {
      title: 'I need to buy magazines.',
      type: 'imBack',
      value: 'I need to buy magazines.'
    },
    {
      title: 'Mark buy magazines as completed.',
      type: 'imBack',
      value: 'Mark buy magazines as completed.'
    }
  ]
};

function taskLike({ text }: { text: string }, pattern: string) {
  return compareTwoStrings(text, pattern) > 0.8;
}

async function sendHelp(context: TurnContext) {
  await context.sendActivity({
    speak: 'You could say, "what is on my list?", "I need to buy magazines", or "mark buy magazines as completed."',
    suggestedActions: SUGGESTED_ACTIONS,
    text: [
      'You could say:',
      '',
      '- What is on my list?',
      '- I need to buy magazines.',
      '- Mark buy magazines as completed.'
    ].join('\n'),
    type: 'message'
  });
}

async function sendReduxEvent(context: TurnContext, action: unknown) {
  await context.sendActivity({
    name: 'redux action',
    type: 'event',
    value: action
  });
}

function humanJoin(array: string[]): string {
  const others = [...array];
  const last = others.pop();

  if (others.length) {
    return [others.join(', '), last].join(' and ');
  } else {
    return last || '';
  }
}

export default class Bot extends ActivityHandler {
  constructor() {
    super();

    this.onMembersAdded(async (context, next) => {
      await context.sendActivity({
        attachments: [
          {
            contentType: 'x-todobot-tasks'
          }
        ],
        text: ['Hello, William! Here are your tasks.'].join('\n'),
        type: 'message'
      });

      await sendHelp(context);
      await next();
    });

    this.onEvent(async (context, next) => {
      const {
        activity: { name, value }
      } = context;

      if (name === 'redux state') {
        const { state, store } = value;

        switch (state) {
          case 'welcome':
            const incompletedTasks = store.tasks.filter((task: ToDoTask) => !task.completed);

            if (incompletedTasks.length) {
              await context.sendActivity(
                [
                  `You have ${incompletedTasks.length} tasks to work on:`,
                  '',
                  ...incompletedTasks.map((task: ToDoTask) => `- ${task.text}`)
                ].join('\n')
              );
            } else {
              await context.sendActivity("Your to-do list is empty, let's add something.");
            }

            break;
        }
      }

      await next();
    });

    this.onMessage(async (context, next) => {
      const { activity } = context;

      if (/^((i\sneed\sto)|(add))\s/iu.test(activity.text)) {
        const text = activity.text
          .replace(/^((i\sneed\sto)|(add))\s/iu, '')
          .replace(/\sto\s((my|the)\s)?list\.?$/iu, '')
          .trim();
        const [firstChar, ...otherChars] = text.replace(/\.$/, '');
        const cleanText = [(firstChar || '').toUpperCase(), ...otherChars].join('');
        const existingTask = activity.channelData.reduxStore.tasks.find((task: ToDoTask) => taskLike(task, cleanText));

        if (existingTask) {
          await context.sendActivity(`You already added the task "${existingTask.text}".`);
        } else {
          await sendReduxEvent(context, {
            payload: {
              id: `t-${random().toString(36).substr(2, 5)}`,
              text: cleanText
            },
            type: 'ADD_TASK'
          });

          await context.sendActivity(`Okay, adding "${cleanText}" to your list.`);
        }
      } else if (/^mark\s/iu.test(activity.text)) {
        const text = activity.text
          .substr(5)
          .replace(/\sas\s(in)?((completed?)|(finish(ed)?))\.?$/iu, '')
          .trim();
        const completed = !/((incompleted?)|(unfinish(ed)?))\.?$/iu.test(activity.text);
        const existingTask = activity.channelData.reduxStore.tasks.find((task: ToDoTask) => taskLike(task, text));

        if (!existingTask) {
          await context.sendActivity(`No task was named "${text}".`);
        } else if (completed) {
          if (existingTask.completed) {
            await context.sendActivity(`"${existingTask.text}" is already completed.`);
          } else {
            await sendReduxEvent(context, {
              payload: { id: existingTask.id },
              type: 'MARK_TASK_AS_COMPLETED'
            });

            await context.sendActivity(`Marking "${existingTask.text}" as completed.`);
          }
        } else {
          if (!existingTask.completed) {
            await context.sendActivity(`"${existingTask.text}" is not completed.`);
          } else {
            await sendReduxEvent(context, {
              payload: { id: existingTask.id },
              type: 'MARK_TASK_AS_INCOMPLETED'
            });

            await context.sendActivity(`Marking "${existingTask.text}" as incomplete.`);
          }
        }
      } else if (/^(delete|remove)\s/iu.test(activity.text)) {
        const text = activity.text
          .substr(7)
          .replace(/\sfrom\s((my|the)\s)?list\.?$/iu, '')
          .trim();
        const existingTask = activity.channelData.reduxStore.tasks.find((task: ToDoTask) => taskLike(task, text));

        if (!existingTask) {
          await context.sendActivity(`No task was named "${text}".`);
        } else {
          await sendReduxEvent(context, {
            payload: { id: existingTask.id },
            type: 'DELETE_TASK'
          });

          await context.sendActivity(`Deleting "${existingTask.text}" from your list.`);
        }
      } else if (/^(show|what).*?(lists?|tasks?)[\.\?]?$/iu.test(activity.text)) {
        const { tasks } = activity.channelData.reduxStore;
        const completedTasks = tasks.filter(({ completed }: ToDoTask) => completed);
        const incompletedTasks = tasks.filter(({ completed }: ToDoTask) => !completed);

        await context.sendActivity({
          attachments: [
            {
              contentType: 'x-todobot-tasks'
            }
          ],
          speak: [
            'Here is your list.<break strength="medium" />',
            completedTasks.length
              ? humanJoin(completedTasks.map(({ text }: ToDoTask) => `"${text}"`)) +
                ` ${completedTasks.length > 1 ? 'are' : 'is'} done.<break strength="medium" />`
              : '',
            incompletedTasks.length
              ? 'You need to ' + humanJoin(incompletedTasks.map(({ text }: ToDoTask) => `"${text}"`)) + '.'
              : ''
          ].join(''),
          text: 'Here is your list.',
          type: 'message'
        });

        await sendReduxEvent(context, { type: 'SHOW_TASK_LIST' });
      } else if (/^help(\s|$)/iu.test(activity.text)) {
        await sendHelp(context);
      } else {
        await context.sendActivity(`Sorry, I don't know what you said.`);
      }

      await next();
    });
  }
}
