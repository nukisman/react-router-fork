export const intercalate: <T>(
  array: T[],
  separator: (index: number) => T
) => T[] = (array, separator) =>
  array
    .slice(1)
    .reduce((acc, item, i) => [...acc, separator(i), item], [array[0]]);

export const spy = <T>(label: string, x: T): T => {
  console.log(label, x);
  return x;
};
