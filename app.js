var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser')
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('music.db')
var mu = require('mu2');
var models = require('./models');
var bcrypt = require("bcrypt");
var cookieParser = require('cookie-parser')


// Create new express server
var app = express();
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({   // to support URL-encoded bodies
  extended: true
}));
app.use(cookieParser())
mu.root = __dirname
var server = require('http').Server(app);
var io = require('socket.io')(server);
// GET
app.get('/playlist.css', function(request, response) {
  response.sendFile(__dirname + '/playlist.css');
});

app.get('/login', function(request,response){
  response.sendFile(__dirname + '/login.html')
})

app.get('/playlists.html', function(request, response) {
  response.sendFile(__dirname + '/playlist.html');
});

app.get('/music-app.js', function(request, response) {
  response.sendFile(__dirname + '/music-app.js');
});

app.get('/grey.jpg', function(request, response) {
  response.sendFile(__dirname + '/grey.jpg');
});

// redirect /
app.get('/', function(request, response) {
  var session=request.cookies.sessionToken;
  if(session!= undefined){
    response.status(301);
    response.setHeader('Location', 'http://localhost:3000/playlists');
    response.send('redirecting to playlists\n\n');
  }
  else{
    response.status(301);
    response.setHeader('Location', 'http://localhost:3000/login');
    response.send('redirecting to login\n\n');
  }
});

// redirect /playlists
app.get('/playlists', function(request, response) {
  var session=request.cookies.sessionToken;
  if(session != undefined){
    response.sendFile(__dirname + '/playlist.html');
  }
  else{
    response.status(301);
    response.setHeader('Location', 'http://localhost:3000/login');
    response.send('redirecting to login\n\n');
  }
});

// redirect /library
app.get('/library', function(request, response) {
  var session=request.cookies.sessionToken;
  if(session != undefined){
    response.sendFile(__dirname + '/playlist.html');
  }
  else{
    response.status(301);
    response.setHeader('Location', 'http://localhost:3000/login');
    response.send('redirecting to login\n\n');
  }
});

//redirect /songs
app.get('/search', function(request, response) {
  var session=request.cookies.sessionToken;
  if(session != undefined){
    response.sendFile(__dirname + '/playlist.html');
  }
  else{
    response.status(301);
    response.setHeader('Location', 'http://localhost:3000/login');
    response.send('redirecting to login\n\n');
  }
});

//get api songs
app.get('/api/songs', function(request, response) {
    models.Song.findAll()
        .then(function(songs) {
            var sendMessage  = songs.map(function(song){
                return song.get({plain: true})
            });
            for (var i = 0; i < sendMessage.length; i++) {
              sendMessage[i].id = i;
            }

            response.end(JSON.stringify(sendMessage));
        });
});

// get api playlists
app.get('/api/playlists', function(request, response) {
    var session=request.cookies.sessionToken;

    models.Session.findOne({
      where: {
        sessionKey: session
      }
    }).then(function(session){
      if(session === null){
        response.status(403);
        response.send("No permission to access playlists")
      }
      else{
        var userID = session.sessionUser;
        models.User.findOne({
          where: {
            id: userID
          }
        }).then(function(user){
          user.getPlaylists().then(function(playlists){
                  // var result = {playlists:[]};
                  var counter = 0;
                  var solution = [];
                  playlists.forEach(function(playlistRecord){
  					         playlistRecord.getSongs().then(function(result){



                       //for (var i = 0; i < playlists.length; i++) {
                        //  var copyPlaylists = playlists.map(function(playlist){
                        //    return playlist.get({plain: true})
                        //  })
                         var eachPlaylist = {};
                         eachPlaylist.id  = playlistRecord.id - 1;
                         console.log("playlistsRecord id is"+playlistRecord.id)
                         console.log("eachPlaylist id is"+ eachPlaylist.id)
                         eachPlaylist.name = playlistRecord.name;
             						 eachPlaylist.songs = [];
                         //if(playlists[counter].id === result[counter].SongsPlaylists.PlaylistId){
                           //console.log("it work")
                           for (var j = 0; j < result.length; j++) {
                             eachPlaylist.songs.push(result[j].id-1);
                            //  console.log('work');
                           }
                         //}
                         solution.push(eachPlaylist);
             					//}
                      counter++;
                      if(counter === playlists.length){

                         response.end(JSON.stringify(solution));
                         console.log("solution is--------------------------- "+JSON.stringify(solution))
                       }

                  })
					   })
          })
        })
      }
    })

})
io.on('connection',function(socket){
app.delete('/playlists/:id', function(req,res){
    var id=parseInt(req.params.id);
    var song=parseInt(req.body.song);
    var session=req.cookies.sessionToken;
    models.Playlist.findOne(
      {
        where: {
          id:id
        }
      }
    ).then( function(target){
            models.Session.findOne(
            {
                where:
                {
                   sessionKey: session
                }
            }
          ).then(function(session){
                session.getUser(
                ).then(function(user){
                  user.getPlaylists(
                  ).then(function(playlists){
                    var hasPermission = false;
                    for (var i =0 ; i < playlists.length; i++){
                      if(id === playlists[i].id){
                        hasPermission = true;
                        break;
                      }
                    }
                    if (hasPermission === true){
                      target.removeSong(song);
                      res.end("done");
                      var message={};
                      message.playlist=id;
                      message.song=song;
                      socket.broadcast.emit('delete',JSON.stringify(message));

                    }
                    else{
                      res.status(403);
                      res.send('no permission');
                    }
                  })
                })
          })
    })
  })


app.post('/api/playlists/:playlist_id', function(req, res){
  var id=parseInt(req.params.playlist_id);
  var song=parseInt(req.body.song);
  var session=req.cookies.sessionToken;
  models.Playlist.findOne(
    {
      where: {

        id:id
      }
    }
  ).then( function(target){
          models.Session.findOne(
          {
              where:
              {
                 sessionKey: session
              }
          }
        ).then(function(session){
              session.getUser(

              ).then(function(user){
                user.getPlaylists(

                ).then(function(playlists){
                  var hasPermission = false;
                  for (var i =0 ; i < playlists.length; i++){
                    // console.log("playlist number"+i+"vaule is"+playlists[i])
                    if(id === playlists[i].id){
                      hasPermission = true;
                      break;
                    }
                  }
                  if (hasPermission=== true){
                    target.addSong(song);
                    res.end("done");
                    var message={playlist:null, song:null};
                    message.playlist=id;
                    message.song=song;
                    socket.broadcast.emit('add',JSON.stringify(message));
                  }
                  else{
                    res.status(403);
                    res.send('no permission');
                  }
                })
              })
        })
  })
});
});
app.post('/api/playlists', function(req,res){
  var tem=req.body.name;
  models.Playlist.create({name:tem})
  .then(function(new_playlist){
    var send={id:new_playlist.id, name:new_playlist.name};
    res.end(JSON.stringify(send));
  })
})

app.get ('/api/users',function(req,res){
  var sessionToken = req.cookies.sessionToken;
  models.Session.findOne({
    where : {
      sessionKey: sessionToken
    }
  }).then(function(session){
    if (session === null){
      res.status(403);
      res.send ('need log in!!!');
    }
    else{
      var userID = session.sessionUser;
      models.User.findAll({
        where : {
          id : {$ne: userID}
        }
      }).then(function(users){
        data = users.map(function(user){
          return{
            id : user.id - 1,
            username:user.username
          }
        });
        res.end (JSON.stringify({"users":data}));
      })
    }
  })
})




var crypto = require('crypto');

var generateKey = function() {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
};

//login post
  app.post('/login', function(request, response) {
      var name = request.body['name'];
      var password = request.body['password'];

      models.User.findOne({
        where: {
          username: name
        }
      }).then(function(user){
        if (user === null){
          response.end('invaild password',401);
        }else{
          bcrypt.compare(password, user.password, function(err, res){
            if (res){
              console.log("res");
              var sessionToken = generateKey();
              models.Session.create({
                sessionKey : sessionToken,
                sessionUser : user.id
              }).then(function(session){
                console.log("succss session");
                response.setHeader('Set-Cookie','sessionToken=' + sessionToken);
                response.setHeader('Location', './playlists');
                response.status(301);
                response.send("Successful");
              });
            }else{
              console.log("wrong");
              response.status(401);
              response.send("wrong");
            }
          });
        }
      });
  });
  // app.listen(3000, function () {
  //     console.log('Example app listening on port 3000! Open and accepting connections until someone kills this process');
  // });
  models.sequelize.sync().then(function() {
      server.listen(3000, function () {
        console.log('Example app listening on port 3000! Open and accepting connections until someone kills this process');
      });
  });
