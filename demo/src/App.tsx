import React, { FC } from 'react';
import {
  Fork,
  ForkWrapper,
  CaseConsumer,
  CaseWrapper,
  ActiveView,
  ForkConsumer
} from 'react-router-fork';
import map from 'lodash/map';
import reduce from 'lodash/reduce';
import capitalize from 'lodash/capitalize';
import { spy } from './utils';
import { Link, NavLink, BrowserRouter } from 'react-router-dom';
import { menu } from './shared';
import { intercalateFragments } from './react-utils';

const currencies = ['eth', 'btc', 'ltc'];
const txsFilter = ['all', 'deposit', 'withdraw'];

/** Good: Now Node knows about its cases
 *  Good: Explicit typing of leaf components: Txs, Receive, etc. */

const App: FC<{}> = () => (
  <BrowserRouter>
    <>
      <h3 className="orange">Demo: react-router-fork</h3>
      <h4>Absolute links</h4>
      {menu(
        '',
        ' ',
        '  ',
        '/ ',
        '/  ',
        '/hello world',
        '/xxx',
        '/',
        '/setup2fa',
        '/wallet',
        '/wallet/btc',
        '/wallet/xxx',
        '/wallet/eth',
        '/wallet/eth/txs',
        '/wallet/eth/txs/deposit',
        '/wallet/eth/txs/invalid',
        '/wallet/eth/receive',
        '/wallet/eth/bbb',
        '/cards',
        '/cards/eth',
        '/cards/btc',
        '/cards/ltc',
        '/cards/aaa'
      )}
      <Test />
    </>
  </BrowserRouter>
);
export default App;

const Test: FC<{}> = () => (
  <>
    <hr />
    <Fork name="section" default="wallet" wrapper={Tabs} caseWrapper={ShowCase}>
      {{
        setup2fa: 'Setup 2FA',
        'hello world': 'Hello World',
        // '': 'Empty Case',
        // ' ': 'Space Case'</ShowCase>',
        // '  ': 'Double Space Case',
        wallet: (
          <Fork
            name="currency"
            default="eth"
            cases={currencies}
            wrapper={Tabs}
            caseWrapper={ShowCase}>
            {(currency: string) => (
              <Fork
                name="op"
                default="txs"
                wrapper={Tabs}
                caseWrapper={ShowCase}>
                {{
                  txs: (
                    <Fork
                      name="filter"
                      default="deposit"
                      // cases={[...txsFilter, ' ']}
                      cases={txsFilter}
                      wrapper={Tabs}
                      caseWrapper={ShowCase}>
                      {(filter: string) => (
                        <Txs currency={currency} filter={filter} />
                      )}
                    </Fork>
                  ),
                  receive: <Receive currency={currency} />
                }}
              </Fork>
            )}
          </Fork>
        ),
        cards: (
          <Fork
            name="currency"
            default="eth"
            wrapper={Tabs}
            caseWrapper={ShowCase}
            cases={currencies}>
            {(currency: string) => <Receive currency={currency} />}
          </Fork>
        )
      }}
    </Fork>
  </>
);

const Tabs: ForkWrapper = ({ children, cases }) => (
  <div>
    [{' '}
    {intercalateFragments(
      map(spy('cases', cases), ({ url }, value) => (
        <NavLink key={value} to={url}>
          {capitalize(value)}
        </NavLink>
      )),
      ' | '
    )}{' '}
    ]{children}
  </div>
);

const ShowCase: CaseWrapper = ({
  parentFork,
  isActive,
  value,
  url,
  children,
  params,
  paramsOrder
}) => (
  <ActiveView
    isActive={isActive}
    style={{
      paddingLeft: '2em'
    }}
    // passive="flush"
    // passive={{
    //   style: {
    //     background: 'darkgray',
    //     paddingLeft: '2em'
    //   }
    // }}
  >
    <hr />
    <h2>
      {parentFork.name}: {value}
    </h2>
    {url}
    <br />
    <Breadcrumbs />
    <br />
    {children}
  </ActiveView>
);

const Breadcrumbs: FC<{}> = () => (
  <ForkConsumer>
    {({ paramsOrder, defaultPath, breadcrumbs }) => (
      <>
        {/*<br />*/}
        {/*[{paramsOrder.join(', ')}]*/}
        {/*<br />*/}
        {/*[{defaultPath.join(', ')}]*/}/{' '}
        {intercalateFragments(
          map(breadcrumbs, ({ name, value, path, url }, i) => (
            <span title={`${capitalize(name)}: ${capitalize(value)}`}>
              <Link key={name} to={url}>
                {capitalize(value || 'home')}
              </Link>
            </span>
          )),
          ' / '
        )}
      </>
    )}
  </ForkConsumer>
);

const ShowParams: FC<{
  expectedParams: { [key: string]: string };
}> = ({ expectedParams }) => (
  <CaseConsumer>
    {({ params }) => {
      const invalidParams: { [key: string]: string } = reduce(
        expectedParams,
        (acc, v, k) => (v === params[k].value ? acc : { ...acc, [k]: '' + v }),
        {}
      );
      return (
        <>
          <ul>
            {map(params, (data, name) => (
              <li key={name}>
                {name}:{' '}
                <span className={invalidParams[name] ? 'invalid' : 'valid'}>
                  {data.value}{' '}
                  {invalidParams[name] && (
                    <span
                      style={{ border: 'solid white 1px', padding: '0.3em' }}>
                      Expected: {invalidParams[name]}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      );
    }}
  </CaseConsumer>
);

export const Cards: FC<{ currency: string }> = props => (
  <ShowParams expectedParams={props} />
);

export const Receive: FC<{
  currency: string;
}> = props => <ShowParams expectedParams={props} />;

export const Txs: FC<{
  currency: string;
  filter: string;
}> = props => (
  <>
    <ShowParams expectedParams={props} />
    <h6>Relative links</h6>
    {menu('./all', './all/../../txs/all', '../txs/./deposit', '../receive')}
  </>
);
