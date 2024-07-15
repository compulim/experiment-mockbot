// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationServiceClientCredentialFactory,
  type TurnContext
} from 'botbuilder';
import { object, parse, string } from 'valibot';

// Catch-all for errors.
const onTurnErrorHandler: CloudAdapter['onTurnError'] = async (context: TurnContext, error: Error) => {
  // This check writes out errors to console log .vs. app insights.
  // NOTE: In production environment, you should consider logging this to Azure
  //       application insights.
  console.error(`\n [onTurnError] unhandled error: ${error}`);

  // Send a trace activity, which will be displayed in Bot Framework Emulator
  await context.sendTraceActivity(
    'OnTurnError Trace',
    `${error}`,
    'https://www.botframework.com/schemas/error',
    'TurnError'
  );

  // Send a message to the user
  await context.sendActivity('The bot encountered an error or bug.');
  await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

const envSchema = object({
  MicrosoftAppId: string('"MicrosoftAppId" must be set in environment variable.'),
  MicrosoftAppTenantId: string('"MicrosoftAppTenantId" must be set in environment variable.'),
  MicrosoftAppType: string('"MicrosoftAppType" must be set in environment variable.')
});

export default function createBotFrameworkAdapter() {
  const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
    undefined,
    new ConfigurationServiceClientCredentialFactory(parse(envSchema, process.env))
  );

  // See https://aka.ms/about-bot-adapter to learn more about how bots work.
  const adapter = new CloudAdapter(botFrameworkAuthentication);

  // Set the onTurnError for the singleton BotFrameworkAdapter.
  adapter.onTurnError = onTurnErrorHandler;

  return adapter;
}
