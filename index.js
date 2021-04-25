const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const { Translate } = require('@google-cloud/translate').v2;
require('dotenv').config();
const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);
const translate = new Translate({ credentials: CREDENTIALS, projectId: CREDENTIALS.project_id });
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');
const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);


let languagesDictionary = {
  "Select A Language": "en",
  "English": "en",
  "Spanish": "es",
  "Albanian": "sq",
  "Amharic": "am",
  "Arabic": "ar",
  "Afrikaans": "af",
  "Armenian": "hy",
  "Azerbaijani": "az",
  "Basque": "eu",
  "Belarusian": "be",
  "Bengali": "bn",
  "Bosnian": "bs",
  "Bulgarian": "bg",
  "Catalan": "ca",
  "Cebuano": "ceb",
  "Chinese (Simplified)": "zh-CN",
  "Chinese (Traditional)": "zh-TW",
  "Corsican": "co",
  "Croatian": "hr",
  "Czech": "cs",
  "Danish": "da",
  "Dutch": "nl",
  "Esperanto": "eo",
  "Estonian": "et",
  "Finnish": "fi",
  "French": "fr",
  "Frisian": "fy",
  "Galician": "gl",
  "Georgian": "ka",
  "German": "de",
  "Greek": "el",
  "Gujarati": "gu",
  "Haitian Creole": "ht",
  "Hausa": "ha",
  "Hawaiian": "haw",
  "Hebrew_he": "he",
  "Hebrew iw": "iw",
  "Hindi": "hi",
  "Hmong": "hmn",
  "Hungarian": "hu",
  "Icelandic": "is",
  "Igbo": "ig",
  "Indonesian": "id",
  "Irish": "ga",
  "Italian": "it",
  "Japanese": "ja",
  "Javanese": "jv",
  "Kannada": "kn",
  "Kazakh": "kk",
  "Khmer": "km",
  "Kinyarwanda": "rw",
  "Korean": "ko",
  "Kurdish": "ku",
  "Kyrgyz": "ky",
  "Lao": "lo",
  "Latin": "la",
  "Latvian": "lv",
  "Lithuanian": "lt",
  "Luxembourgish": "lb",
  "Macedonian": "mk",
  "Malagasy": "mg",
  "Malay": "ms",
  "Malayalam": "ml",
  "Maltese": "mt",
  "Maori": "mi",
  "Marathi": "mr",
  "Mongolian": "mn",
  "Myanmar (Burmese)": "my",
  "Nepali": "ne",
  "Norwegian": "no",
  "Nyanja (Chichewa)": "ny",
  "Odia (Oriya)": "or",
  "Pashto": "ps",
  "Persian": "fa",
  "Polish": "pl",
  "Portuguese (Portugal, Brazil)": "pt",
  "Punjabi": "pa",
  "Romanian": "ro",
  "Russian": "ru",
  "Samoan": "sm",
  "Scots Gaelic": "gd",
  "Serbian": "sr",
  "Sesotho": "st",
  "Shona": "sn",
  "Sindhi": "sd",
  "Sinhala (Sinhalese)": "si",
  "Slovak": "sk",
  "Slovenian": "sl",
  "Somali": "so",
  "Sundanese": "su",
  "Swahili": "sw",
  "Swedish": "sv",
  "Tagalog (Filipino)": "tl",
  "Tajik": "tg",
  "Tamil": "ta",
  "Tatar": "tt",
  "Telugu": "te",
  "Thai": "th",
  "Turkish": "tr",
  "Turkmen": "tk",
  "Ukrainian": "uk",
  "Urdu": "ur",
  "Uyghur": "ug",
  "Uzbek": "uz",
  "Vietnamese": "vi",
  "Welsh": "cy",
  "Xhosa": "xh",
  "Yiddish": "yi",
  "Yoruba": "yo",
  "Zulu": "zu"
}

io.on('connect', (socket) => {
  socket.on('join', ({ name, room, chosenLanguage }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });
    if (error) return callback(error);
    socket.join(user.room);
    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the ${user.room} chat` });
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has entered the chat` });
    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    callback();
  });

  socket.on('sendMessage', async ({message, chosenLanguage}, callback) => {
    const user = getUser(socket.id);
    try {
      const text = message;
      const target = languagesDictionary[chosenLanguage];
      const [translation] = await translate.translate(text, target);
      io.to(user.room).emit('message', { user: user.name, text: message, translation });

    } catch (error) {
      console.error(error);
    }
    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left the chat` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    }
  })
});


server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));