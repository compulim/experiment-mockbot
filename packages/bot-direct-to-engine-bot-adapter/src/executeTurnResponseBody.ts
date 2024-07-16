import {
  array,
  object,
  objectWithRest,
  pipe,
  string,
  union,
  unknown,
  value,
  type BaseSchema,
  type InferOutput,
  type StringIssue
} from 'valibot';

const executeTurnResponseBodySchema = object({
  action: union([
    pipe(string() as BaseSchema<string, 'continue', StringIssue>, value('continue')),
    pipe(string() as BaseSchema<string, 'waiting', StringIssue>, value('waiting'))
  ]),
  activities: array(objectWithRest({}, unknown())),
  conversationId: string()
});

export default executeTurnResponseBodySchema;
export type ExecuteTurnResponseBody = InferOutput<typeof executeTurnResponseBodySchema>;
