import React, { FC } from 'react';
import { RouteChildrenProps } from 'react-router';
import { Link } from 'react-router-dom';

export type Leaf<T> = FC<RouteChildrenProps<T>>;
// todo: Show amount of spaces in space-only links
export const menu = (...tos: string[]): JSX.Element => (
  <ul>
    {tos.map(to => (
      <li key={to}>
        <Link to={to}>{to || '(empty)'}</Link>
      </li>
    ))}
  </ul>
);

export const Cards: Leaf<{ currency: string }> = props => {
  console.log('Cards', { props });
  const match = props.match;
  return (
    <div>
      Cards
      {showParams(match, 'currency')}
    </div>
  );
};

export const Receive: Leaf<{ currency: string }> = props => {
  console.log('Receive', { props });
  const match = props.match;
  return (
    <div>
      Receive
      {showParams(match, 'currency')}
    </div>
  );
};

export const Txs: Leaf<{ currency: string; type: string }> = props => {
  console.log('Txs', { props });
  const match = props.match;
  return (
    <div>
      Txs
      {showParams(match, 'currency', 'type')}
      <h6>Relative links</h6>
      {menu('./all', './all/../../txs/all', '../txs/./deposit', '../receive')}
    </div>
  );
};

const showParam = (
  params: { [key: string]: string },
  name: string
): JSX.Element => (
  <span>
    {name}:{' '}
    <span style={{ color: params[name] === undefined ? 'darkred' : 'green' }}>
      {params[name] || 'undefined'}
    </span>
  </span>
);

const showParams = (
  match: { params: { [key: string]: string } } | null,
  ...expectedParams: string[]
): JSX.Element =>
  match !== null ? (
    <ul>
      {expectedParams.map((name, i) => (
        <li key={i}>{showParam(match.params, name)}</li>
      ))}
    </ul>
  ) : (
    <span style={{ color: 'darkred' }}>match === null</span>
  );
