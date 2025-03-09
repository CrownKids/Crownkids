const express = require('express');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Ruta para verificar que el bot está activo
app.get('/', (req, res) => {
    res.send("El bot está activo");
});

// Ruta del webhook de Twilio
app.post('/webhook', (req, res) => {
    const { Body, From } = req.body;
    console.log(`Mensaje recibido de ${From}: ${Body}`);

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("¡Hola! Soy un bot automático. ¿En qué puedo ayudarte?");

    res.type('text/xml').send(twiml.toString());
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});
