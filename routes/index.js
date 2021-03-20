var express = require('express');
var router = express.Router();

const CODE_LENGTH = 4;
let games = [];

// stolen straight from boardspace
// but I wrote it there so it's ok
function generateCode(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charLen = characters.length;
  let code = "";
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * charLen));
  }
  return code;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  let err = "";
  if (req.query.err) {
    switch(req.query.err) {
      case "code": 
        err = "Invalid code.";
        break;
      case "gip":
        err = "Attempted to join game already in progress";
        break;
    }
  }
  res.render('index', {err: err});
});

router.post('/', function(req, res, next) {
  if(games.includes(req.body.code)) {
    let color = req.body.color.substring(1);
    return res.redirect("/game?code="+req.body.code+"&color="+color);
  } else {
    return res.redirect('/?err=code');
  }
});

/* GET home page. */
router.get('/game', function(req, res, next) {
  let code = req.query.code;
  let color = req.query.color;
  let side = (req.query.side == "true");
  res.render('game', {code:code, color: color, side: side});
});

router.get('/gameover', function(req, res, next) {
  if(req.query.close) {
    const index = games.indexOf(req.query.close);
    if (index > -1) {
      games.splice(index, 1);
    }
  }
  let won = req.query.won == "true";
  return res.render(won ? "winner" : "loser");
});

router.get('/createboard', function(req, res, next) {
  let code = generateCode(CODE_LENGTH);
  while(games.includes(code)) {
    code = generateCode(CODE_LENGTH);
  }
  res.render('createboard', {code: code});
});

router.post('/createboard', function(req, res, next) {
  let code = req.body.code;
  let color = req.body.color;
  let side = req.body.side;
  switch(side) {
    case "left":
      side = true;
      break;
    case "right":
      side = false;
      break;
    case "random":
      side = (Math.random() < 0.5);
      break;
  }
  games.push(code);
  color = color.substring(1);
  return res.redirect('/game?code='+code+'&color='+color+'&left='+side);
});

module.exports = router;
