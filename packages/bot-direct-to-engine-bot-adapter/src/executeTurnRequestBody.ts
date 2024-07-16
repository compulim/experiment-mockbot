import { object, objectWithRest, unknown, type InferOutput } from 'valibot';

const executeTurnRequestBodySchema = object({
  activity: objectWithRest({}, unknown())
});

export default executeTurnRequestBodySchema;
export type ExecuteTurnRequestBody = InferOutput<typeof executeTurnRequestBodySchema>;
