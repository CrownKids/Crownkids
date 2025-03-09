const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 📌 DEBUG: Ver contenido de GOOGLE_SERVICE_ACCOUNT antes de parsear
console.log("📌 Contenido de GOOGLE_SERVICE_ACCOUNT:", process.env.GOOGLE_SERVICE_ACCOUNT);

try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT está vacío o no está definido.");
    }

    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    const auth = new JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    async function loadSheet() {
        await doc.useServiceAccountAuth(auth);
        await doc.loadInfo();
        return doc.sheetsByIndex[0];
    }
} catch (error) {
    console.error("❌ Error al procesar GOOGLE_SERVICE_ACCOUNT:", error.message);
}

const userState = {};

// Webhook para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
    try {
        const message = req.body.Body ? req.body.Body.toLowerCase().trim() : "";
        const from = req.body.From;

        if (!message) {
            return res.sendStatus(200);
        }

        console.log(`📩 Mensaje recibido: ${message} de ${from}`);

        let responseMessage = "No entendí tu mensaje. Por favor, usa una opción válida.";

        if (!userState[from]) {
            userState[from] = { step: "inicio" };
        }

        switch (userState[from].step) {
            case "inicio":
                responseMessage = "¡Hola! ¿En qué podemos ayudarte?\n1️⃣ Impresiones 🖨️\n2️⃣ Libros Escolares 📚\n3️⃣ Preguntas Frecuentes ❓";
                userState[from].step = "menu_principal";
                break;

            case "menu_principal":
                if (message === "1") {
                    responseMessage = "Ofrecemos impresiones en alta calidad. ¿Qué necesitas imprimir?";
                    userState[from].step = "impresiones";
                } else if (message === "2") {
                    responseMessage = "📚 ¿Cuántos libros necesitas?\n1️⃣ 5 a 10\n2️⃣ 10 a 20\n3️⃣ 20 a 50\n4️⃣ Más de 50";
                    userState[from].step = "cantidad_libros";
                } else if (message === "3") {
                    responseMessage = "Preguntas Frecuentes:\n- ¿Cuánto tarda una impresión? Generalmente en 24-48 hs.\n- ¿Hacen envíos? Sí, a todo el país.";
                    userState[from].step = "preguntas_frecuentes";
                } else {
                    responseMessage = "Por favor, elige una opción válida (1, 2 o 3).";
                }
                break;

            case "cantidad_libros":
                if (["1", "2", "3", "4"].includes(message)) {
                    responseMessage = "🌍 ¿Qué idioma de libros necesitas?\n1️⃣ Español 🇪🇸\n2️⃣ Inglés 🇬🇧";
                    userState[from].cantidad = message;
                    userState[from].step = "idioma_libros";
                } else {
                    responseMessage = "Por favor, elige una opción válida (1, 2, 3 o 4).";
                }
                break;

            case "idioma_libros":
                if (message === "1") {
                    responseMessage = "📖 ¿Qué editorial buscas?\n1️⃣ Santillana\n2️⃣ Capeluz";
                    userState[from].idioma = "Español";
                    userState[from].step = "editorial_libros";
                } else if (message === "2") {
                    responseMessage = "📖 ¿Qué editorial buscas?\n1️⃣ Pearson\n2️⃣ Cambridge";
                    userState[from].idioma = "Inglés";
                    userState[from].step = "editorial_libros";
                } else {
                    responseMessage = "Por favor, elige una opción válida (1 o 2).";
                }
                break;

            default:
                responseMessage = "No entendí tu mensaje. Usa una opción válida.";
                userState[from].step = "inicio";
        }

        // Enviar respuesta
        await axios.post('https://api.twilio.com/2010-04-01/Accounts/' + process.env.TWILIO_SID + '/Messages.json', new URLSearchParams({
            From: process.env.TWILIO_WHATSAPP_NUMBER,
            To: from,
            Body: responseMessage
        }), {
            auth: {
                username: process.env.TWILIO_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            }
        });

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Error en el webhook:", error);
        res.sendStatus(500);
    }
});

// Endpoint para verificar si el bot está activo
app.get('/', (req, res) => {
    res.send("🚀 El bot está activo y funcionando.");
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});
