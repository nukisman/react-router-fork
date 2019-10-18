import React, {
  FC,
  Fragment,
  ReactNode,
  CSSProperties,
  useContext
} from 'react';
import map from 'lodash/map';
import uniq from 'lodash/uniq';
import difference from 'lodash/difference';
import { match, Redirect, Route } from 'react-router';
import { Input, useInput } from 'react-hooks-pure';

type Maybe<T> = T | undefined;

export type ParamsData = {
  [key: string]: {
    value: string;
    url: string;
    path: string[];
  };
};

export type Breadcrumb = {
  name: string;
  value: string;
  defaultCase: string;
  url: string;
  path: string[];
};

type ForkContext = {
  name: string;
  isActive: boolean;
  cases: { [key: string]: { url: string; path: string[] } };
  params: ParamsData;
  paramsOrder: string[];
  // todo: Refactor: activeCase.*
  activeCase: string;
  // todo: Refactor: defaultCase.*
  defaultCase: string;
  defaultUrl: string;
  defaultPath: string[];
  breadcrumbs: Breadcrumb[];
  parentCase: Maybe<CaseContext>;
};
const rootForkContext: ForkContext = {
  name: '',
  isActive: true,
  cases: {},
  params: {},
  paramsOrder: [],
  defaultPath: [],
  defaultCase: '',
  defaultUrl: '',
  activeCase: '',
  breadcrumbs: [],
  parentCase: undefined
};
const ForkContext = React.createContext<ForkContext>(rootForkContext);

type CaseContext = {
  isActive: boolean;
  value: string;
  path: string[];
  url: string;
  params: ParamsData;
  paramsOrder: string[];
  parentFork: ForkContext;
};

const rootCaseContext: CaseContext = {
  isActive: true,
  path: [],
  url: '',
  params: {},
  paramsOrder: [],
  value: '',
  parentFork: rootForkContext
};
const CaseContext = React.createContext<CaseContext>(rootCaseContext);

type CaseMap = { [key: string]: ReactNode };
type CaseFun = (aCase: string) => ReactNode;
type Cases = CaseMap | CaseFun;

const caseMap = (
  name: string,
  caseList: Maybe<string[]>,
  children: Cases
): CaseMap => {
  if (children instanceof Function) {
    if (caseList === undefined)
      throw new ForkError(
        name,
        `If children is function then cases should be array`
      );
    else if (caseList.length === 0)
      throw new ForkError(name, `List of cases should not be empty`);
    else {
      checkCaseList(name, caseList);
      return caseList.reduce(
        (acc, aCase) => ({ ...acc, [aCase]: children(aCase) }),
        {}
      );
    }
  } else {
    if (caseList !== undefined)
      throw new ForkError(
        name,
        `If children is object then cases should be undefined`
      );
    else {
      checkCaseList(name, Object.keys(children));
      return children;
    }
  }
};

const checkCaseList = (name: string, caseList: string[]): void => {
  const empty: Maybe<string> = caseList.find(c => c.trim() === '');
  if (empty !== undefined)
    throw new ForkError(
      name,
      `List of cases contains empty (space only) value: ${caseList
        .map(c => `"${c}"`)
        .join(', ')}`
    );
  const dupFree = uniq(caseList);
  if (caseList.length !== dupFree.length) {
    const dups = difference(caseList, dupFree);
    console.warn(
      `${name}: List of cases contains duplicates: [${dups.join(', ')}]`
    );
  }
};

class ForkError extends Error {
  constructor(name: string, msg: string) {
    super(`${name}: ${msg}`);
  }
}

/** Declare new (sub)tree */
export const Fork: FC<{
  name: string;
  default?: Maybe<string>;
  // TODO: Make context readonly
  wrapper?: Maybe<ForkWrapper>;
  // TODO: Make context readonly
  caseWrapper?: Maybe<CaseWrapper>;
  cases?: Maybe<string[]>;
  children: Cases;
}> = ({
  name,
  default: dflt,
  cases: caseList,
  children,
  wrapper = defaultForkWrapper,
  caseWrapper
}) => {
  const cases = caseMap(name, caseList, children);
  const caseValues = Object.keys(cases);
  const match = useInput<Maybe<match<{ [key: string]: string }>>>(undefined);
  const caseContext = useContext(CaseContext);
  if (dflt && !caseValues.includes(dflt))
    throw new ForkError(
      name,
      `Default case (${dflt}) not contained in case list: ${caseValues.join(
        ', '
      )}`
    );
  const defaultCase: string = dflt || caseValues[0];
  const activeCase = useInput<string>(defaultCase);
  return caseValues.length === 0 ? null : (
    // TODO: DOM tree depth: Replace <Route path> with useRouteMatch(path)
    <Route
      path={absUrl([...caseContext.path, `:${name}?`])}
      children={props => {
        if (caseContext.isActive && props.match !== null) {
          match.set(props.match);
        }

        if (match.state) {
          const caseValue: string = match.state.params[name];
          console.log(
            'Fork Route:',
            { path: absUrl([...caseContext.path, `:${name}?`]) },
            { caseValue, caseValues, matchState: match.state },
            props
          );
          const isValid: boolean = caseValues.includes(caseValue);
          const isActive: boolean =
            caseContext.isActive && props.match !== null;
          const defaultPath = [
            ...caseContext.parentFork.defaultPath,
            defaultCase
          ];
          const breadcrumbPath = [...caseContext.path, defaultCase];
          const breadcrumbUrl = absUrl(breadcrumbPath);
          const forkContext: ForkContext = {
            name,
            isActive,
            activeCase: isValid ? caseValue : activeCase.state,
            defaultCase,
            defaultPath,
            defaultUrl: absUrl(defaultPath),
            breadcrumbs: [
              ...caseContext.parentFork.breadcrumbs,
              {
                name: caseContext.parentFork.name,
                value: caseContext.value,
                defaultCase,
                path: breadcrumbPath,
                url: breadcrumbUrl
              }
            ],
            params: {
              ...caseContext.parentFork.params,
              [name]: {
                value: caseValue,
                path: [...caseContext.path, caseValue],
                url: absUrl([...caseContext.path, caseValue])
              }
            },
            paramsOrder: [...caseContext.parentFork.paramsOrder, name],
            cases: caseValues.reduce((acc, c) => {
              const path = [...caseContext.path, c];
              return {
                ...acc,
                [c]: { path, url: absUrl(path) }
              };
            }, {}),
            parentCase: caseContext
          };
          const redirectOn = true;
          const redirectTo: string = absUrl([
            ...caseContext.path,
            caseValue === undefined ? activeCase.state : defaultCase
          ]);
          const content = (
            <Fragment>
              {map(cases, (content: ReactNode, value: string) => (
                <Case
                  key={value}
                  caseContext={caseContext}
                  forkContext={forkContext}
                  value={value}
                  activeCase={activeCase}
                  wrapper={caseWrapper}>
                  {content}
                </Case>
              ))}
              {redirectOn &&
                caseContext.isActive &&
                !isValid &&
                props.match &&
                props.match.url !== redirectTo && <Redirect to={redirectTo} />}
            </Fragment>
          );
          return (
            <ForkContext.Provider value={forkContext}>
              {wrapper({
                ...forkContext,
                children: content
              })}
            </ForkContext.Provider>
          );
        } else return null;
      }}
    />
  );
};

const Case: FC<{
  children: ReactNode;
  caseContext: CaseContext;
  forkContext: ForkContext;
  value: string;
  activeCase: Input<string>;
  wrapper?: CaseWrapper;
}> = ({
  caseContext,
  forkContext,
  children,
  value,
  activeCase,
  wrapper = defaultCaseWrapper
}) => {
  const match = useInput<Maybe<match<{ [key: string]: string }>>>(undefined);
  return (
    // TODO: DOM tree depth: Replace <Route path> with useRouteMatch(path)
    <Route
      path={absUrl([...caseContext.path, `:${forkContext.name}(${value})`])}>
      {props => {
        if (forkContext.isActive && props.match !== null) {
          match.set(props.match);
        }
        const isActive = forkContext.isActive && props.match !== null;
        if (isActive) activeCase.set(value);
        const path = [...caseContext.path, value];
        const url = absUrl(path);
        const context: CaseContext = {
          // TODO: Make context readonly
          parentFork: forkContext,
          isActive,
          value,
          params: {
            ...forkContext.params,
            [forkContext.name]: {
              value,
              url,
              path
            }
          },
          paramsOrder: forkContext.paramsOrder,
          path,
          url
        };
        return match.state ? (
          <CaseContext.Provider value={context}>
            {wrapper({
              ...context,
              children
            })}
          </CaseContext.Provider>
        ) : null;
      }}
    </Route>
  );
};

export const absUrl = (items: string[]): string => `/${items.join('/')}`;

export type ChildrenProps = { children: ReactNode };
export type ForkWrapper = (props: ForkContext & ChildrenProps) => ReactNode;

export type CaseWrapper = (props: CaseContext & ChildrenProps) => ReactNode;

export const defaultForkWrapper: ForkWrapper = ({ isActive, children }) => (
  <ActiveView isActive={isActive} children={children} />
);
export const defaultCaseWrapper: CaseWrapper = ({ isActive, children }) => (
  <ActiveView isActive={isActive} children={children} />
);

export const ActiveView: FC<{
  isActive: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  passive?:
    | 'flush'
    | {
        className?: string;
        style?: CSSProperties;
      };
}> = ({
  isActive,
  children,
  className = '',
  style = {},
  passive = { className: '', style: { display: 'none' } }
}) =>
  isActive ? (
    <div className={className} style={style}>
      {children}
    </div>
  ) : passive === 'flush' ? null : (
    <div
      className={className + ' ' + passive.className}
      style={{ ...style, ...passive.style }}>
      {children}
    </div>
  );

// TODO: Make context readonly
/** ForkConsumer - uses current route case */
export const ForkConsumer: FC<{
  children: (props: ForkContext) => ReactNode;
}> = ({ children }) => (
  // TODO: DOM tree depth: Replace <ForkContext.Consumer> with useContext(ForkContext)
  <ForkContext.Consumer>
    {(context: ForkContext) => {
      if (context === rootForkContext)
        throw new Error(
          'ForkConsumer out of any ForkContext. Use ForkConsumer inside of Fork.children or Fork.wrapper'
        );
      else return children(context);
    }}
  </ForkContext.Consumer>
);

// TODO: Make context readonly
/** CaseConsumer - uses current route case */
export const CaseConsumer: FC<{
  children: (props: CaseContext) => ReactNode;
}> = ({ children }) => (
  // TODO: DOM tree depth: Replace <CaseContext.Consumer> with useContext(CaseContext)
  <CaseContext.Consumer>
    {(context: CaseContext) => {
      if (context === rootCaseContext)
        throw new Error(
          'CaseConsumer out of any CaseContext. Use CaseConsumer inside of Fork.children or Fork.caseWrapper'
        );
      else return children(context);
    }}
  </CaseContext.Consumer>
);

// Ugly Code
//  [x] Maybe<Context> ==> Context
//  [x] Avoid caseValue === ''
//  [x] Fork.caseWrapper
//  [x] Clear design for Fork vs Case
//  [x] ActiveView: Single place for controlling flush:boolean & style={..., display: 'none'}
// Inactive nodes: (solution: save some state?)
//  [x] Re-renders on match.params changed, but still inactive
//  [x] Receives invalid data (match.params and match.path)
//  [x] Lazy rendering: Should not be render if was not active before (no previous valid data)
//    [x] Lazy rendering: Fork
//    [x] Lazy rendering: Case
// Features:
//  [x] Save previously selected sub-path (redirect to activeCase.state)
//    [x] Redirect from invalid case to default one
//    [x] Redirect from undefined case to active one
//  [x] Tabs: correct working NavLinks
//  [x] Disabled relative(!) links on inactive routes (need in debug mode only)
//  [x] Breadcrumbs
// Safety:
//  [x] Check default case contained in case list
//  [x] Remove duplicated cases (+ print Warning)
//  [x] Check case not empty (else throw Error). But support in-between spaces.
