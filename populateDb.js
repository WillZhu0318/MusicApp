var fs = require('fs');
var models = require('./models');
var bcrypt = require('bcrypt');


models.sequelize.sync({force: true}).then(function() {

    fs.readFile('./songs.json', function(err, data) {
        var music_data = JSON.parse(data);
        var songs = music_data['songs'];

        songs.forEach(function(song) {

            models.Song.create({
                title: song.title,
                album: song.album,
                artist: song.artist,
                duration: song.duration,
            });
        });
    });

    fs.readFile('./playlists.json', function(err, data) {
        var music_data = JSON.parse(data);
        var playlists = music_data['playlists'];

        playlists.forEach(function(playlist) {

            models.Playlist.create({
                name: playlist.name,
              }).then(function(SongsPlaylists){
                playlist.songs.forEach(function(song_id){
                  models.Song.findOne({where: {id : song_id+1} })
                    .then(function(songRecord){
                      SongsPlaylists.addSong(songRecord);
                    })
                })
              });
        });
    });

    fs.readFile('./User.json', function(err, data) {
        var users_data = JSON.parse(data);
        var users = users_data['users'];
        users.forEach(function(user) {
          bcrypt.hash(user.password, 10, function(err, hash) {
            models.User.create({
                username: user.username,
                password: hash
            }).then(function(newUser){
              user.playlists.forEach(function(result){
                models.Playlist.findOne({where: {id : result+1} })
                  .then(function(playlist){
                    newUser.addPlaylist(playlist);
                  })
              });
            });
          });
        });
    });
});
