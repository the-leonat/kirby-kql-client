/**
 * SelectShape: the object a select produces on one object of class `C`.
 *
 * The select may be a record, a list of keys or a comma-separated string; all
 * three give the same shape. Keys set to `false` are left out; a select without
 * any key left gives an empty array. Each entry is
 * - `true`: the key read from the current object,
 * - a string: a query string, starting at the current object,
 * - an object with `query`: a nested query, starting at the current object,
 * - an object without `query`: the key read from the current object, then
 *   selected; paginated by its `options.pagination` (a `pagination` key is ignored).
 */
import type { ClassName, Schema } from '../schema.ts';
import type { Select } from '../query.ts';
import type { Follow } from './walk.ts';
import type { NoSelect, Render } from './render.ts';
import type { Evaluate, HasPagination } from './result.ts';
import type { Trim } from './parse.ts';
import type { Impossible } from './impossible.ts';
export type SelectShape<C extends ClassName<S>, Sel extends Select, S extends Schema> = Shape<C, AsRecord<Sel>, S> extends infer Selected ? [ImpossibleEntries<Selected>] extends [never] ? EmptyAsArray<Selected> : ImpossibleEntries<Selected> : never;
/** An impossible entry makes the whole select impossible: KQL rejects the whole request. */
type ImpossibleEntries<Selected> = Extract<Selected[keyof Selected], Impossible>;
/** KQL builds the object as a PHP array, so one without keys is `[]` in JSON. */
type EmptyAsArray<Selected> = [keyof Selected] extends [never] ? never[] : Selected;
type Shape<C extends ClassName<S>, Entries, S extends Schema> = {
    -readonly [Key in keyof Entries as Entries[Key] extends false ? never : Key]: Entry<C, Key & string, Entries[Key], S>;
};
type Entry<C extends ClassName<S>, Key extends string, Value, S extends Schema> = Value extends true ? Render<ReadKey<C, Key, S>, NoSelect, S> : Value extends string ? Evaluate<{
    query: Value;
}, S, C> : Value extends {
    query: string;
} ? Evaluate<Value, S, C> : Value extends {
    select: infer Sel;
} ? Render<ReadKey<C, Key, S>, Sel, S, HasPagination<OptionsOf<Value>>> : Render<ReadKey<C, Key, S>, NoSelect, S>;
type OptionsOf<Value> = Value extends {
    options: infer Options;
} ? Options : {};
/** What `$object->$key()` returns. */
type ReadKey<C extends string, Key extends string, S extends Schema> = Follow<C, [
    {
        name: Key;
        args: 0;
        optional: false;
    }
], S>;
/** Turns a key list or comma-separated string into a record of `true`. */
type AsRecord<Sel extends Select> = Sel extends string ? {
    [Key in SplitKeys<Sel>]: true;
} : Sel extends readonly string[] ? {
    [Key in Sel[number]]: true;
} : Sel;
type SplitKeys<S extends string> = S extends `${infer Key},${infer Rest}` ? Trim<Key> | SplitKeys<Rest> : Trim<S>;
export {};
