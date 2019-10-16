import React, {
  FunctionComponent,
  Fragment,
  ReactNode,
  CSSProperties
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

type SwitchContext = {
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
const rootSwitchContext: SwitchContext = {
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
const SwitchContext = React.createContext<SwitchContext>(rootSwitchContext);

type CaseContext = {
  isActive: boolean;
  value: string;
  path: string[];
  url: string;
  params: ParamsData;
  paramsOrder: string[];
  parentSwitch: SwitchContext;
};

const rootCaseContext: CaseContext = {
  isActive: true,
  path: [],
  url: '',
  params: {},
  paramsOrder: [],
  value: '',
  parentSwitch: rootSwitchContext
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
      throw new SwitchError(
        name,
        `If children is function then cases should be array`
      );
    else if (caseList.length === 0)
      throw new SwitchError(name, `List of cases should not be empty`);
    else {
      checkCaseList(name, caseList);
      return caseList.reduce(
        (acc, aCase) => ({ ...acc, [aCase]: children(aCase) }),
        {}
      );
    }
  } else {
    if (caseList !== undefined)
      throw new SwitchError(
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
    throw new SwitchError(
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

class SwitchError extends Error {
  constructor(name: string, msg: string) {
    super(`${name}: ${msg}`);
  }
}

/** Declare new (sub)tree */
// TODO: Rename to Fork
export const Switch: FunctionComponent<{
  name: string;
  default?: Maybe<string>;
  // TODO: Make context readonly
  wrapper?: Maybe<SwitchWrapper>;
  // TODO: Make context readonly
  caseWrapper?: Maybe<CaseWrapper>;
  cases?: Maybe<string[]>;
  children: Cases;
}> = ({
  name,
  default: dflt,
  cases: caseList,
  children,
  wrapper = defaultSwitchWrapper,
  caseWrapper
}) => {
  const cases = caseMap(name, caseList, children);
  const caseValues = Object.keys(cases);
  if (caseValues.length === 0) return null;
  else {
    if (dflt && !caseValues.includes(dflt))
      throw new SwitchError(
        name,
        `Default case (${dflt}) not contained in case list: ${caseValues.join(
          ', '
        )}`
      );
    const defaultCase: string = dflt || caseValues[0];
    // FIXME
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const activeCase = useInput<string>(defaultCase);
    // FIXME
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const match = useInput<Maybe<match<{ [key: string]: string }>>>(undefined);
    return (
      <CaseContext.Consumer>
        {(caseContext: CaseContext) => (
          <Route
            path={absUrl([...caseContext.path, `:${name}?`])}
            children={props => {
              if (caseContext.isActive && props.match !== null) {
                match.set(props.match);
              }

              if (match.state) {
                const caseValue: string = match.state.params[name];
                console.log(
                  'Switch Route:',
                  { path: absUrl([...caseContext.path, `:${name}?`]) },
                  { caseValue, caseValues, matchState: match.state },
                  props
                );
                const isValid: boolean = caseValues.includes(caseValue);
                const isActive: boolean =
                  caseContext.isActive && props.match !== null;
                const defaultPath = [
                  ...caseContext.parentSwitch.defaultPath,
                  defaultCase
                ];
                const breadcrumbPath = [...caseContext.path, defaultCase];
                const breadcrumbUrl = absUrl(breadcrumbPath);
                const switchContext: SwitchContext = {
                  name,
                  isActive,
                  activeCase: isValid ? caseValue : activeCase.state,
                  defaultCase,
                  defaultPath,
                  defaultUrl: absUrl(defaultPath),
                  breadcrumbs: [
                    ...caseContext.parentSwitch.breadcrumbs,
                    {
                      name: caseContext.parentSwitch.name,
                      value: caseContext.value,
                      defaultCase,
                      path: breadcrumbPath,
                      url: breadcrumbUrl
                    }
                  ],
                  params: {
                    ...caseContext.parentSwitch.params,
                    [name]: {
                      value: caseValue,
                      path: [...caseContext.path, caseValue],
                      url: absUrl([...caseContext.path, caseValue])
                    }
                  },
                  paramsOrder: [...caseContext.parentSwitch.paramsOrder, name],
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
                        switchContext={switchContext}
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
                      props.match.url !== redirectTo && (
                        <Redirect to={redirectTo} />
                      )}
                  </Fragment>
                );
                return (
                  <SwitchContext.Provider value={switchContext}>
                    {wrapper({
                      ...switchContext,
                      children: content
                    })}
                  </SwitchContext.Provider>
                );
              } else return null;
            }}
          />
        )}
      </CaseContext.Consumer>
    );
  }
};

const Case: FunctionComponent<{
  children: ReactNode;
  caseContext: CaseContext;
  switchContext: SwitchContext;
  value: string;
  activeCase: Input<string>;
  wrapper?: CaseWrapper;
}> = ({
  caseContext,
  switchContext,
  children,
  value,
  activeCase,
  wrapper = defaultCaseWrapper
}) => {
  const match = useInput<Maybe<match<{ [key: string]: string }>>>(undefined);
  return (
    <Route
      path={absUrl([...caseContext.path, `:${switchContext.name}(${value})`])}>
      {props => {
        if (switchContext.isActive && props.match !== null) {
          match.set(props.match);
        }
        const isActive = switchContext.isActive && props.match !== null;
        if (isActive) activeCase.set(value);
        const path = [...caseContext.path, value];
        const url = absUrl(path);
        const context: CaseContext = {
          // TODO: Make context readonly
          parentSwitch: switchContext,
          isActive,
          value,
          params: {
            ...switchContext.params,
            [switchContext.name]: {
              value,
              url,
              path
            }
          },
          paramsOrder: switchContext.paramsOrder,
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
export type SwitchWrapper = (props: SwitchContext & ChildrenProps) => ReactNode;

export type CaseWrapper = (props: CaseContext & ChildrenProps) => ReactNode;

export const defaultSwitchWrapper: SwitchWrapper = ({ isActive, children }) => (
  <ActiveView isActive={isActive} children={children} />
);
export const defaultCaseWrapper: CaseWrapper = ({ isActive, children }) => (
  <ActiveView isActive={isActive} children={children} />
);

export const ActiveView: FunctionComponent<{
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
/** SwitchConsumer - uses current route case */
export const SwitchConsumer: FunctionComponent<{
  children: (props: SwitchContext) => ReactNode;
}> = ({ children }) => (
  <SwitchContext.Consumer>
    {(context: SwitchContext) => {
      if (context === rootSwitchContext)
        throw new Error(
          'SwitchConsumer out of any SwitchContext. Use SwitchConsumer inside of Switch.children or Switch.wrapper'
        );
      else return children(context);
    }}
  </SwitchContext.Consumer>
);

// TODO: Make context readonly
/** CaseConsumer - uses current route case */
export const CaseConsumer: FunctionComponent<{
  children: (props: CaseContext) => ReactNode;
}> = ({ children }) => (
  <CaseContext.Consumer>
    {(context: CaseContext) => {
      if (context === rootCaseContext)
        throw new Error(
          'CaseConsumer out of any CaseContext. Use CaseConsumer inside of Switch.children or Switch.caseWrapper'
        );
      else return children(context);
    }}
  </CaseContext.Consumer>
);

// Ugly Code
//  [x] Maybe<Context> ==> Context
//  [x] Avoid caseValue === ''
//  [x] Switch.caseWrapper
//  [x] Clear design for Switch vs Case
//  [x] ActiveView: Single place for controlling flush:boolean & style={..., display: 'none'}
// Inactive nodes: (solution: save some state?)
//  [x] Re-renders on match.params changed, but still inactive
//  [x] Receives invalid data (match.params and match.path)
//  [x] Lazy rendering: Should not be render if was not active before (no previous valid data)
//    [x] Lazy rendering: Switch
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
