require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();
const port = process.env.PORT || 10000; // Render usa el puerto 10000 por defecto

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta principal para verificar que el servidor está activo
app.get("/", (req, res) => {
    res.send("El bot está activo");
});

// Ruta del webhook para recibir mensajes de WhatsApp
app.post("/webhook", (req, res) => {
    try {
        const twiml = new twilio.twiml.MessagingResponse();

        // Verificar si hay un mensaje recibido
        if (!req.body || !req.body.Body) {
            console.error("Error: No se recibió un mensaje válido.");
            return res.status(400).send("No se recibió un mensaje válido.");
        }

        const message = req.body.Body.toLowerCase(); // Convertir el mensaje a minúsculas
        console.log("Mensaje recibido:", message);

        let respuesta;

        if (message.includes("hola")) {
            respuesta = "¡Hola! Soy un bot automático. ¿En qué puedo ayudarte?";
        } else if (message.includes("libros")) {
            respuesta = "Tenemos libros en español e inglés. ¿Cuál te interesa?";
        } else if (message.includes("español")) {
            respuesta = "Aquí tienes nuestra lista de libros en español...";
        } else if (message.includes("inglés")) {
            respuesta = "Aquí tienes nuestra lista de libros en inglés...";
        } else {
            respuesta = "No entendí tu mensaje. ¿Puedes reformularlo?";
        }

        twiml.message(respuesta);
        res.writeHead(200, { "Content-Type": "text/xml" });
        res.end(twiml.toString());

    } catch (error) {
        console.error("Error en el webhook:", error);
        res.status(500).send("Error interno del servidor.");
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${port}`);
});
