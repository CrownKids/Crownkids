const express = require('express');
const twilio = require('twilio');
const { google } = require('googleapis');

// 📌 Configuración del servidor
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📌 Configuración de Google Sheets
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});
const spreadsheetId = "1JbBKXOLL_ByTEcxdGfA9ulLC47TGRjDq_-oFiH-GQPE"; // 📌 ID de tu Google Sheets

// 📌 Función para obtener libros desde Google Sheets
async function getBooks() {
    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
        auth: client,
        spreadsheetId,
        range: 'A:F' // 📌 Ajusta según la cantidad de columnas que tengas
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
        return [];
    }

    return rows.slice(1).map(row => ({
        id: row[0],
        title: row[1],
        language: row[2],
        editorial: row[3],
        subject: row[4],
        link: row[5]
    }));
}

// 📌 Ruta para verificar que el bot está activo
app.get('/', (req, res) => {
    res.send("El bot está activo");
});

// 📌 Webhook de Twilio
app.post('/webhook', async (req, res) => {
    console.log("Datos recibidos:", req.body); // 👈 Log para depuración

    const { Body, From } = req.body;
    
    if (!Body) {
        console.log("⚠️ No se recibió ningún mensaje en req.body.Body");
        return res.send("OK");
    }

    const message = Body.toLowerCase().trim();
    console.log("Mensaje recibido:", message);

    let responseText = "¡Hola! ¿Qué necesitas?\n";
    responseText += "1️⃣ Libros de colegio 📚\n";
    responseText += "2️⃣ Impresiones 🖨️\n";
    responseText += "3️⃣ Otra consulta ❓";

    // 📌 Paso 1: Elegir categoría
    if (message === "1") {
        responseText = "📌 ¿Qué idioma necesitas?\n1️⃣ Español\n2️⃣ Inglés";
    } else if (message === "2") {
        responseText = "🖨️ Para impresiones, comunícate con un representante.";
    } else if (message === "3") {
        responseText = "❓ Por favor, describe tu consulta.";
    } else if (message === "español" || message === "inglés") {
        responseText = "🏢 ¿De qué editorial es el libro?\n1️⃣ Santillana\n2️⃣ Kapelusz\n3️⃣ Oxford";
    } else if (["santillana", "kapelusz", "oxford"].includes(message)) {
        responseText = "📘 ¿Qué materia necesitas?\n1️⃣ Matemática\n2️⃣ Lengua\n3️⃣ Ciencias";
    } else if (["matemática", "lengua", "ciencias"].includes(message)) {
        const books = await getBooks();
        const filteredBooks = books.filter(book => 
            book.subject.toLowerCase() === message
        );

        if (filteredBooks.length === 0) {
            responseText = "❌ No encontramos ese libro. Un representante te ayudará.";
        } else {
            responseText = "📚 Aquí están los libros disponibles:\n\n";
            filteredBooks.forEach(book => {
                responseText += `📖 ${book.title} - ${book.editorial}\n🔗 ${book.link}\n\n`;
            });
        }
    } else {
        responseText = "⚠️ Opción no válida. Por favor, selecciona un número del menú.";
    }

    // 📌 Enviar respuesta a WhatsApp
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(responseText);
    
    res.type('text/xml').send(twiml.toString());
});

// 📌 Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});
