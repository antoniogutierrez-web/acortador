// Cargar las variables de entorno definidas en el archivo .env
require('dotenv').config();

// Importamos las dependencias necesarias
const express = require('express');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Creamos una instancia de la aplicación Express
const app = express();

// Configuramos middleware para parsear el cuerpo de las solicitudes (JSON y formularios URL-encoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


// Conexión a MongoDB usando la cadena de conexión almacenada en process.env.MONGO_URI
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));


// Definición del esquema para guardar las URLs
const urlSchema = new mongoose.Schema({
  longUrl: { type: String, required: true },      // La URL original
  shortId: { type: String, required: true, unique: true },  // El identificador corto
  createdAt: { type: Date, default: Date.now }      // Fecha de creación
});

// Modelo de Mongoose basado en el esquema anterior
const Url = mongoose.model('Url', urlSchema);

// Endpoint para acortar una URL
// Recibimos en el cuerpo de la petición una propiedad "longUrl"
app.post('/api/shorten', async (req, res) => {
  const { longUrl } = req.body;

  // Validamos que se envíe la URL larga
  if (!longUrl) {
    return res.status(400).json({ error: "El campo 'longUrl' es obligatorio." });
  }
  
  // Generamos un identificador corto único de 7 caracteres
  const shortId = nanoid(7);

  try {
    // Creamos un nuevo registro de URL en la base de datos
    const newUrl = new Url({ longUrl, shortId });
    await newUrl.save();

    // Respondemos con la URL acortada. Construimos la URL usando el protocolo y host de la solicitud
    res.json({ shortUrl: `${req.protocol}://${req.get('host')}/${shortId}`, shortId });
  } catch (error) {
    console.error('Error al guardar la URL:', error);
    res.status(500).json({ error: "Error al guardar la URL en la base de datos." });
  }
});

// Endpoint para redireccionar: cuando se visita /:shortId se busca la URL original y se redirige
app.get('/:shortId', async (req, res) => {
  const { shortId } = req.params;

  try {
    // Buscamos el registro que tenga el identificador corto
    const record = await Url.findOne({ shortId });
    if (record) {
      // Si se encuentra, redireccionamos a la URL larga
      return res.redirect(record.longUrl);
    } else {
      // Si no se encuentra, respondemos con un error 404
      return res.status(404).json({ error: "URL no encontrada." });
    }
  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// Configuramos el puerto en el que el servidor escuchará (variable de entorno o 3000 por defecto)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
