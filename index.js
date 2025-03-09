const express = require('express');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// 📌 Base de datos de libros (ejemplo)
const books = [
    { id: 1, title: "Libro de Matemáticas 1", language: "Español", editorial: "Santillana" },
    { id: 2, title: "English for Kids", language: "Inglés", editorial: "Oxford" },
    { id: 3, title: "Ciencias Naturales 3", language: "Español", editorial: "Kapelusz" },
];

// 📌 Ruta para verificar que el bot está activo
app.get('/', (req, res) => {
    res.send("El bot está activo");
});

// 📌 Webhook de WhatsApp
app.post('/webhook', (req, res) => {
    const { Body, From } = req.body;
    const message = Body.toLowerCase().trim();
    
    let responseText = "¡Hola! ¿Qué necesitas?\n";
    responseText += "1️⃣ Ver libros en español\n";
    responseText += "2️⃣ Ver libros en inglés\n";
    responseText += "3️⃣ Contactar con un humano";

    // 📌 Responder según la opción elegida
    if (message === "1") {
        let booksList = books.filter(book => book.language === "Español")
                             .map(book => `📚 ${book.title} - Editorial: ${book.editorial}`)
                             .join("\n");
        responseText = booksList || "No hay libros disponibles en español.";
    } else if (message === "2") {
        let booksList = books.filter(book => book.language === "Inglés")
                             .map(book => `📚 ${book.title} - Editorial: ${book.editorial}`)
                             .join("\n");
        responseText = booksList || "No hay libros disponibles en inglés.";
    } else if (message === "3") {
        responseText = "📞 Un representante se comunicará contigo en breve.";
        // Aquí podríamos agregar una función para avisar a un humano
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
