/******************************************************
 * PLEASE DO NOT EDIT THIS FILE
 * the verification process may break
 * ***************************************************/
const fs = require("fs");
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');

app.use(express.json());

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

if (!process.env.DISABLE_XORIGIN) {
  app.use(function (req, res, next) {
    var allowedOrigins = [
      "https://narrow-plane.gomix.me",
      "https://www.freecodecamp.com",
    ];
    var origin = req.headers.origin || "*";
    if (!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1) {
      console.log(origin);
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
    }
    next();
  });
}

app.use("/public", express.static(process.cwd() + "/public"));

app.route("/_api/package.json").get(function (req, res, next) {
  console.log("requested");
  fs.readFile(__dirname + "/package.json", function (err, data) {
    if (err) return next(err);
    res.type("txt").send(data.toString());
  });
});

app.route("/").get(function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// app.route("/api/:date?").get(function (req, res) {
//   const dateString = req.params.date;
//   if (!dateString)
//     return res
//       .status(200)
//       .send({ unix: Date.now(), utc: new Date().toUTCString() });
//       var dateObj;
//   if (/\d{5,}/.test(dateString)) {
//      dateObj = new Date(parseInt(dateString));
//   }else{
//     dateObj = new Date(dateString);
//   }
//   if (!isNaN(dateObj)) {
//     return res.status(200).json({ unix: dateObj.valueOf(), utc: dateObj.toUTCString() });
//   } else {
//     return res.status(400).json({ error: "Invalid Date" });
//   }
// });

// app.route("/api/whoami").get(function (req, res) {
//   return res.json({ipaddress : "14.248.82.197" , language : "Vietnamese" , software : "web"})
// });


//1.function to manage local file storage (File data.json)
function dataManagement(action, input) {
  let filePath = './public/data.json';
  //check if file exist -> create new file if not exist
  if (!fs.existsSync(filePath)) {
    fs.closeSync(fs.openSync(filePath, 'w'));
  }

  //read file data.json
  let file = fs.readFileSync(filePath);
  
  //screnario for save input into data
  if (action == 'save data' && input != null) {
      //check if file is empty
    if (file.length == 0) {
      //add new data to json file
      fs.writeFileSync(filePath, JSON.stringify([input], null, 2));
    } else {
      //append input to data.json file
      let data = JSON.parse(file.toString());
      //check if input.original_url already exist
      let inputExist = [];
      inputExist  = data.map(d => d.original_url);
      let check_input = inputExist.includes(input.original_url);     
      if (check_input === false) {
        //add input element to existing data json object
        data.push(input);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }
    }
  }

  //screnario for load the data
  else if (action == 'load data' && input == null) {
    if (file.length == 0) { return; }
    else {
      let dataArray = JSON.parse(file);
      return dataArray;
    }
  }
}

//2.function for random short_url (using Math.random())
function gen_shorturl() {
  let all_Data   = dataManagement('load data');
  // generate random number between 1 to data_length*1000
  let min = 1; let max = 1000; 
  if ( all_Data != undefined && all_Data.length > 0 ) { max = all_Data.length*1000 }
  else { max = 1000; }
  let short = Math.ceil(Math.random()* (max - min + 1) + min);
  
  //get all existing short url
  if (all_Data === undefined) { return short; }
  else {
    //check if short url already exist
    let shortExist  = all_Data.map(d => d.short_url);
    let check_short = shortExist.includes(short);
    if ( check_short ) {gen_shorturl(); } else { return short; }
  }
  
}

//3.middleware to handle user url input
app.post('/api/shorturl', (req,res) => {
  //Create variable needs
  let input = '', domain = '', param = '', short = 0;
  
  //Post url from user input
  input = req.body.url;
  if (input === null || input === '') { 
    return res.json({ error: 'invalid url' }); 
  }


  // res.json({original_url : input})
  
  //matches a string with regular expr => return array
  //url should contains : http:// or https://
let urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*(\?[^\s]*)?$/i;
  if(urlRegex.test(input)){
    //search a string with regular expr, and replace the string -> delete https://
    // param = input.replace(/^https?:\/\//i, "");
    //Validate the url
    dns.lookup(param, (err, url_Ip) => {
      if (err) {
        //If url is not valid -> respond error
        console.log(url_Ip);
        return res.json({ error: 'invalid url' });
      }
      else {
        //If url is valid -> generate short url
        let short = gen_shorturl();
        let dict = {original_url : input, short_url : short};
        dataManagement("save data", dict);
        return res.json(dict);
      }
    });
    
  }else{
    return res.json({ error: 'invalid url' });
  }

});

//4.middleware to handle existing short url
app.get('/api/shorturl/:shorturl', (req,res) => {
  let input    = Number(req.params.shorturl);
  let all_Data = dataManagement('load data');
  
  //check if short url already exist
  let shortExist  = all_Data.map(d => d.short_url);
  let check_short = shortExist.includes(input);
  if (check_short && all_Data != undefined) {
    let data_found = all_Data[shortExist.indexOf(input)];
    // res.json({data : data_found, short : input, existing : shortExist});
    res.redirect(data_found.original_url);
  }
  else {
    res.json({data : 'No matching data', short : input, existing : shortExist});
  }
});

// Respond not found to all the wrong routes
app.use(function (req, res, next) {
  res.status(404);
  res.type("txt").send("Not found");
});

// Error Middleware
app.use(function (err, req, res, next) {
  if (err) {
    res
      .status(err.status || 500)
      .type("txt")
      .send(err.message || "SERVER ERROR");
  }
});

//Listen on port set in environment variable or default to 3000
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log("Node.js listening on port " + listener.address().port);
});
