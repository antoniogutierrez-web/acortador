// Cargar las variables de entorno definidas en el archivo .env
require('dotenv').config();

// Importamos las dependencias necesarias
const express = require('express');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Creamos una instancia de la aplicación Express
const app = express();

// Middleware para parsear JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Verificar si la URI de MongoDB está definida
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: La variable de entorno MONGO_URI no está definida.");
  process.exit(1); // Detener la ejecución si no está configurada
}

// Conexión a MongoDB antes de levantar el servidor
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ Conectado a MongoDB');

    // Iniciar el servidor solo si la conexión a MongoDB fue exitosa
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Error al conectar a MongoDB:', err);
    process.exit(1); // Detener la ejecución si hay un error crítico
  });

// Definición del esquema para las URLs
const urlSchema = new mongoose.Schema({
  longUrl: { type: String, required: true },
  shortId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

// Modelo de Mongoose
const Url = mongoose.model('Url', urlSchema);

// Endpoint para acortar una URL
app.post('/api/shorten', async (req, res) => {
  const { longUrl } = req.body;

  if (!longUrl) {
    return res.status(400).json({ error: "El campo 'longUrl' es obligatorio." });
  }

  const shortId = nanoid(7);

  try {
    const newUrl = new Url({ longUrl, shortId });
    await newUrl.save();

    res.json({ shortUrl: `${req.protocol}://${req.get('host')}/${shortId}`, shortId });
  } catch (error) {
    console.error('❌ Error al guardar la URL:', error);
    res.status(500).json({ error: "Error al guardar la URL en la base de datos." });
  }
});

// Endpoint para redireccionar
app.get('/:shortId', async (req, res) => {
  const { shortId } = req.params;

  try {
    const record = await Url.findOne({ shortId });
    if (record) {
      return res.redirect(record.longUrl);
    } else {
      return res.status(404).json({ error: "URL no encontrada." });
    }
  } catch (error) {
    console.error('❌ Error en el servidor:', error);
    res.status(500).json({ error: "Error en el servidor." });
  }
});
