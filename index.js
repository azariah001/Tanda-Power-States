Array.prototype.diff = function(a) {
  return this.filter(function(i) {return a.indexOf(i) < 0;});
};

// ********************** VARIABLES TO MODIFY **********************

var port = 6789
    , clientId = "05359518154607ddc9f65566d705a6952d762b68c2ea59953f02615bcd95ea77"
    , clientSecret = "9da9db758c45e1774340c826a15500511ac5d0b076aa30af217399e545c76060";

// *****************************************************************


// ************************** SERVER CODE **************************

var homePage = "http://localhost:" + port;
var redirectUri = homePage + "/callback";
var site = "https://my.tanda.co/api";
var scopes = [
  "me",
  "roster",
  "device"
];

// Usually token information would be stored in a database for a user
var token;

// Setting variables once is a lazy man's cache
var userInfo;
var rosterInfo;
var check_ins;

// Setup the requirements and express server
var wol = require('wol');
var request = require("request");
var open = require("open");
var express = require("express");
var morgan = require("morgan");
var app = express();
app.set("views", __dirname + "/views");
app.engine("html", require("ejs").renderFile);
app.use(morgan("dev"));

// Setup the OAuth 2 settings
var oauth2 = require("simple-oauth2")({
  clientID: clientId,
  clientSecret: clientSecret,
  site: site,
  tokenPath: "/oauth/token",
  authorizationPath: "/oauth/authorize"
});

// HELPER FUNCTIONS
var makeGetRequestToTanda = function (url, callback) {
  refreshTokenIfNeeded(function () {
    oauth2.api("GET", url, {
      access_token: token.token.access_token
    }, callback)
  })
};

var getUserInfo = function (callback) {
  if (userInfo || !token) {
    callback(userInfo || {})
  } else {
    makeGetRequestToTanda("/v2/users/me", function (err, body) {
      userInfo = body;
      callback(userInfo)
    })
  }
};

var getRosterInfo = function (callback) {
  if (rosterInfo || !token) {
    callback(rosterInfo || {})
  } else {
    makeGetRequestToTanda("/v2/rosters/current", function (err, body) {
      rosterInfo = body;
      callback(rosterInfo, err)
    })
  }
};

var getCheckIns = function (callback) {
  if (check_ins || !token) {
    callback(check_ins || {})
  } else {
    makeGetRequestToTanda("/v2/clockins?device_id=164063&from=2016-04-22&to=2016-04-23", function (err, body) {
      callback(body, err)
    })
  }
};

var refreshTokenIfNeeded = function (callback) {
  if (token.expired()) {
    token.refresh(function (err, result) {
      if (err) {
        console.log("Access Token Error", error.message);
        res.sendStatus(500)
      } else {
        token = result;
        callback()
      }
    })
  } else {
    callback()
  }
};

var toState = function (obj) {
  if (!obj) {
    return ""
  }
  return new Buffer(JSON.stringify(obj)).toString("base64") || ""
};

var fromState = function (string) {
  if (!string) {
    return {}
  }
  return JSON.parse(new Buffer(string, "base64").toString("ascii")) || {}
};



var users = [
  {
    user_id: 123246,
    mac_address: 'E8:9A:8F:B3:FD:4B'
  }
];

var checkin_wol = function() {
  var state = true;
  var last_checkins = [];

  var myinterval = setInterval(function () {
    "use strict";

    var new_checkins;

    getCheckIns(function (check_ins, error) {
      //console.log("error: " + error);

      if (last_checkins.length != check_ins.length) {
        new_checkins = check_ins.diff(last_checkins);
        last_checkins = check_ins;
        console.log(new_checkins);

        for (var checkin of new_checkins) {

          for (var user of users) {

            if (checkin.user_id == user.user_id) {

              if (checkin.type == "clockin") {

                wol.wake(user.mac_address, function(err, res) {
                  console.log(res);
                });
              } else if (checkin.type == "clockout") {

              }
            }
          }
        }
      }

    })
  }, 1000);
};




// ROUTES
app.get("/authenticate", function (req, res) {
  console.log("--- Getting Token ---");
  res.redirect(oauth2.authCode.authorizeURL({
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    state: toState({redirect: req.query.redirect})
  }))
});

app.get("/callback", function (req, res) {
  oauth2.authCode.getToken({
    code: req.query.code,
    redirect_uri: redirectUri
  }, function (err, result) {
    if (err) {
      console.log("Access Token Error", error.message);
      res.sendStatus(500)
    } else {
      token = oauth2.accessToken.create(result);
      console.log("Token: " + JSON.stringify(token));
      var redirect = fromState(req.query.state).redirect || "/";
      res.redirect(redirect)
    }
  })
});

app.get("/", function (req, res) {
  if (!token) {
    res.render("index.html")
  } else {
    refreshTokenIfNeeded(function () {
      getUserInfo(function (userInfo) {
        res.render("authed_index.html", {user_info: userInfo})
      })
    })
  }
});

app.get("/roster", function (req, res) {
  if (!token) {
    res.redirect("/authenticate?redirect=" + encodeURIComponent("/roster"))
  } else {
    refreshTokenIfNeeded(function () {
      getRosterInfo(function (rosterInfo, error) {
        res.render("roster_info.html", {roster_info: rosterInfo, errors: error})
      })
    })
  }
});

app.get("/getCheckIns", function (req, res) {
  if (!token) {
    res.redirect("/authenticate?redirect=" + encodeURIComponent("/getCheckIns"))
  } else {
    refreshTokenIfNeeded(function () {
      getCheckIns(function (check_ins, error) {
        error = "<br>" + error;
        res.render("check_ins.html", {check_ins: check_ins, errors: error});
        checkin_wol();
      })
    })
  }
});



app.listen(port, function () {
  console.log("listening on port: " + port);
  console.log("make sure that " + redirectUri + " is set as a redirect uri for your app");
  open(homePage)
});
