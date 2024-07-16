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
    pipe(string(), value('continue')) as BaseSchema<string, 'continue', StringIssue>,
    pipe(string(), value('waiting')) as BaseSchema<string, 'continue', StringIssue>
  ]),
  activities: array(objectWithRest({}, unknown())),
  conversationId: string()
});

export default executeTurnResponseBodySchema;
export type ExecuteTurnResponseBody = InferOutput<typeof executeTurnResponseBodySchema>;
