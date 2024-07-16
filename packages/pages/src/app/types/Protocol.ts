import { pipe, string, union, value, type BaseSchema, type InferOutput, type StringIssue } from 'valibot';

const protocolSchema = () =>
  union([
    pipe(string() as BaseSchema<string, 'direct line', StringIssue>, value('direct line')),
    pipe(string() as BaseSchema<string, 'direct line ase', StringIssue>, value('direct line ase')),
    pipe(string() as BaseSchema<string, 'direct line speech', StringIssue>, value('direct line speech')),
    pipe(string() as BaseSchema<string, 'direct to engine', StringIssue>, value('direct to engine')),
    pipe(string() as BaseSchema<string, 'direct to engine rest', StringIssue>, value('direct to engine rest'))
  ]);

export { protocolSchema };
export type Protocol = InferOutput<ReturnType<typeof protocolSchema>>;
