const NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({path:'.'+NODE_ENV+'.env'});
const Aplicacion = require('./src/Aplicacion');

const app = new Aplicacion();
app.iniciar();