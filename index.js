const express = require('express');
const twilio = require('twilio');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());

// 📌 Configuración de Google Sheets
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});
const spreadsheetId = "1JbBKXOLL_ByTEcxdGfA9ulLC47TGRjDq_-oFiH-GQPE"; // ID de tu Google Sheets

// 📌 Función para obtener libros desde Google Sheets
async function getBooks() {
    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
        auth: client,
        spreadsheetId,
        range: 'A:G' // 📌 Ajusta según la cantidad de columnas
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.slice(1).map(row => ({
        id: row[0],
        title: row[1],
        language: row[2],
        editorial: row[3],
        subject: row[4],
        link: row[5],
        price: parseFloat(row[6]) // 📌 Convierte precio a número
    }));
}

// 📌 Estados de los usuarios para guiar la conversación
const userState = {};

// 📌 Webhook de WhatsApp
app.post('/webhook', async (req, res) => {
    const { Body, From } = req.body;
    const message = Body.toLowerCase().trim();
    let responseText = "";

    if (!userState[From]) {
        userState[From] = { step: 0 };
    }

    switch (userState[From].step) {
        case 0:
            responseText = "¡Hola! ¿En qué podemos ayudarte?\n1️⃣ Impresiones 🖨️\n2️⃣ Libros Escolares 📚\n3️⃣ Preguntas Frecuentes ❓";
            userState[From].step = 1;
            break;

        case 1:
            if (message === "1") {
                responseText = "🖨️ Para impresiones, comunícate con un representante.";
                delete userState[From];
            } else if (message === "2") {
                responseText = "📌 ¿Cuántas unidades necesitas?\n1️⃣ 5-10 unidades\n2️⃣ 10-20 unidades (5% descuento)\n3️⃣ 20-50 unidades (10% descuento)\n4️⃣ Más de 50 unidades (15% descuento)";
                userState[From].step = 2;
            } else {
                responseText = "⚠️ Opción no válida. Por favor, selecciona 1, 2 o 3.";
            }
            break;

        case 2:
            userState[From].quantityRange = message;
            responseText = "🌍 ¿Qué idioma necesitas?\n1️⃣ Español\n2️⃣ Inglés";
            userState[From].step = 3;
            break;

        case 3:
            userState[From].language = message === "1" ? "Español" : "Inglés";
            responseText = "🏢 ¿De qué editorial es el libro?";
            const books = await getBooks();
            const editorials = [...new Set(books.filter(book => book.language === userState[From].language).map(book => book.editorial))];
            editorials.forEach((ed, index) => responseText += `\n${index + 1}️⃣ ${ed}`);
            userState[From].step = 4;
            break;

        case 4:
            userState[From].editorial = message;
            responseText = "📘 ¿Qué materia necesitas?";
            const subjects = [...new Set(books.filter(book => book.editorial === userState[From].editorial).map(book => book.subject))];
            subjects.forEach((sub, index) => responseText += `\n${index + 1}️⃣ ${sub}`);
            userState[From].step = 5;
            break;

        case 5:
            userState[From].subject = message;
            const filteredBooks = books.filter(book => book.editorial === userState[From].editorial && book.subject === userState[From].subject);
            responseText = "📚 Aquí están los libros disponibles:\n";
            filteredBooks.forEach((book, index) => {
                responseText += `\n${index + 1}️⃣ ${book.title} - ${book.price} por unidad`;
            });
            responseText += "\n\n📌 Escribe el número del libro que deseas.";
            userState[From].step = 6;
            break;

        case 6:
            userState[From].selectedBook = message;
            responseText = "📦 ¿Cuántas unidades necesitas?";
            userState[From].step = 7;
            break;

        case 7:
            userState[From].units = parseInt(message);
            responseText = `✅ El total es: ${(userState[From].units * 20).toFixed(2)}. ¿Deseas confirmar la compra? (Sí/No)`;
            userState[From].step = 8;
            break;

        case 8:
            responseText = "🛒 Tu pedido ha sido registrado.";
            delete userState[From];
            break;
    }

    res.type('text/xml').send(new twilio.twiml.MessagingResponse().message(responseText).toString());
});

app.listen(PORT, () => console.log(`🚀 Bot en puerto ${PORT}`));
