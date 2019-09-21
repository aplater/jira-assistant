import React, { PureComponent, createContext } from 'react';
import { Route, Switch, withRouter } from 'react-router-dom';
import 'moment-timezone/builds/moment-timezone-with-data.min.js';
import registerServices, { inject } from './services';
import 'font-awesome/css/font-awesome.min.css';
import { Growl } from 'primereact/growl';
import 'primereact/resources/themes/nova-light/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'jsd-report/build/css/style.css';
import './scss/style.scss';

import './App.scss';
import { isNumber } from 'util';

const loading = () => (
  <div style={{ position: "fixed", top: "0px", left: "0px", height: "100%", minHeight: "600px", width: "100%", minWidth: "700px", zIndex: 3000, backgroundColor: "#f1f5f9" }}>
    <div className="center-block" style={{ width: "200px", marginTop: "150px" }}>
      <h4 className="animated fadeIn text-center">
        <i className="fa fa-refresh fa-spin" style={{ fontSize: "150px", fontWeight: "bold" }}></i>
        <br /><br />
        Loading... Please wait...
      </h4>
    </div>
  </div>);

// Layout
const DefaultLayout = React.lazy(() => import('./layouts/DefaultLayout'));

// Pages
const Integrate = React.lazy(() => import('./views/pages/integrate/Integrate'));
const Page401 = React.lazy(() => import('./views/pages/p401/Page401'));

export const AppContext = createContext({});

class App extends PureComponent {
  constructor(props) {
    super(props);
    registerServices();
    inject(this, "SessionService", "AuthService", "MessageService");
    this.state = { isLoading: true, needIntegration: false, authenticated: false };
  }

  contextProps = {
    switchUser: (userId) => {
      let url = document.location.hash.substring(2);
      url = url.substring(url.indexOf("/"));
      url = `/${userId}${url}`;
      this.authenticateUser(url, true);
    },
    navigate: (url, userbased) => {
      this.props.history.push(userbased ? `/${this.$session.userId}${url}` : url);
    }
  }

  getMessanger = () => <Growl ref={(el) => this.messenger = el} baseZIndex={3000} />

  UNSAFE_componentWillMount() {
    this.$message.onNewMessage((message) => {
      if (this.messenger) { this.messenger.show(message); }
    });

    this.authenticateUser(this.props.location.pathname);
  }

  authenticateUser(pathname, forceNavigate) {
    const parts = pathname.split("/");
    let userId = parseInt(parts[1]);
    if (!userId || !isNumber(userId)) {
      userId = null;
    }

    // For existing users who uses old UI have the menu saved as /dashboard
    if (pathname.endsWith("/dashboard")) {
      forceNavigate = true;
      pathname += "/0";
    }

    if (pathname.startsWith("/dashboard")) {
      forceNavigate = true;
    }

    if (parts[1] === "integrate") {
      this.setState({ isLoading: false });
    } else {
      this.$auth.authenticate(userId).then((result) => {
        if (result) {
          if (!pathname || pathname === "/") {
            this.props.history.push(`/${this.$session.userId}/dashboard/0`);
          }
          else if (forceNavigate) {
            if (pathname.startsWith("/dashboard")) {
              pathname = `/${this.$session.userId}${pathname}`;
            }
            this.props.history.push(pathname);
          }
          else if (!userId) {
            this.props.history.push(`/${this.$session.userId}${pathname}`);
          }
        }
        else {
          this.props.history.push(this.$session.needIntegration ? "/integrate" : "/401");
        }

        const sessionUser = this.$session.userId || null;
        this.setState({ isLoading: false, authenticated: result, jiraUrl: this.$session.rootUrl, userId: sessionUser });

      }, () => {
        this.props.history.push(this.$session.needIntegration ? "/integrate" : "/401");
        this.setState({ isLoading: false, needIntegration: this.$session.needIntegration, jiraUrl: this.$session.rootUrl });
      });
    }
  }

  render() {
    const { isLoading, userId } = this.state;

    if (isLoading) {
      return <>{this.getMessanger()}{loading()}</>;
    }

    return (
      <>
        {this.getMessanger()}

        <AppContext.Provider value={this.contextProps}>
          <React.Suspense fallback={loading()}>
            <Switch>
              <Route exact path="/integrate" name="Integrate Page" render={props => <Integrate {...props} />} />
              <Route exact path="/401" name="Page 401" render={props => <Page401 {...props} jiraUrl={this.state.jiraUrl} />} />
              <Route key={userId} path="/:userId" name="Home" render={props => <DefaultLayout {...props} />} />
            </Switch>
          </React.Suspense>
        </AppContext.Provider>
      </>
    );
  }
}

export default withRouter(App);
