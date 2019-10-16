import React, { Fragment, ReactNode } from 'react';
import { intercalate } from './utils';

export const intercalateFragments = (
  items: ReactNode[],
  sep: ReactNode
): ReactNode[] =>
  intercalate(
    items.map((item, i) => <Fragment key={'_' + i}>{item}</Fragment>),
    fragmentSeparator(sep)
  );

export const fragmentSeparator: (
  sep: ReactNode
) => (index: number) => ReactNode = sep => i => (
  <Fragment key={i}>{sep}</Fragment>
);
