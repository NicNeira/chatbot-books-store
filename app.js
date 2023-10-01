require('dotenv').config()

const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const PostgreSQLAdapter = require('@bot-whatsapp/database/postgres')
// const MockAdapter = require('@bot-whatsapp/database/mock')

/**
 * Declaramos las conexiones de PostgreSQL
 */


/**
 * Aqui declaramos los flujos hijos, los flujos se declaran de atras para adelante, es decir que si tienes un flujo de este tipo:
 *
 *          Menu Principal
 *           - SubMenu 1
 *             - Submenu 1.1
 *           - Submenu 2
 *             - Submenu 2.1
 *
 * Primero declaras los submenus 1.1 y 2.1, luego el 1 y 2 y al final el principal.
 */

const palabrasClaveBienvenida = ['hola', 'buenas', 'volver']

const bookList = [
    {
        "name": "Don Quijote de la Mancha",
        "author": "Miguel de Cervantes"
    },
    {
        "name": "Cien años de soledad",
        "author": "Gabriel García Márquez"
    },
    {
        "name": "1984",
        "author": "George Orwell"
    },
    {
        "name": "Matar a un ruiseñor",
        "author": "Harper Lee"
    },
    {
        "name": "Ulises",
        "author": "James Joyce"
    },
    {
        "name": "En busca del tiempo perdido",
        "author": "Marcel Proust"
    },
    {
        "name": "El gran Gatsby",
        "author": "F. Scott Fitzgerald"
    },
    {
        "name": "Orgullo y prejuicio",
        "author": "Jane Austen"
    },
    {
        "name": "El señor de los anillos",
        "author": "J.R.R. Tolkien"
    },
    {
        "name": "Crimen y castigo",
        "author": "Fyodor Dostoevsky"
    }
]

// !! No utilizar buttons ya que no funciona correctamente y no te devuelve ningun mensaje con el proveedor baileys 


const flowSearch = addKeyword('stock')
    .addAnswer(['Ingresa el titulo del libro que deseas buscar \n', 'o *volver* para regresar al menu principal'], { capture: true },
        async (ctx, { flowDynamic }) => {
            console.log('Se ha iniciado la busqueda del titulo: ', ctx.body);


            // Todo: Hacer que se pueda volver a realizar otra busqueda ( Sin tener que volver al menu principal )
            if (ctx.body !== 'volver' || ctx.body !== 'horario') {
                const titulo = ctx.body;
                const resultados = bookList.filter(libro => new RegExp(titulo, 'i').test(libro.name));
                const mensajes = resultados.map(libro => ({ body: `Titulo: ${libro.name}, Autor: ${libro.author}` }));
                await flowDynamic(mensajes.length > 0
                    ? [{
                        body: `Si poseemos el libro: "${mensajes.map(mensaje => mensaje.body).join(', ')}" en nuestro inventario.
                        \n Escribe "*volver*" para regresar al menu principal` }]
                    : [{
                        body: `Lo siento, no pudimos encontrar el libro que estás buscando en nuestro inventario.
                        \n Escribe "*volver*" para regresar al menu principal` }]
                );
            }
        })

const flowInfo = addKeyword('horario')
    .addAnswer(
        [
            'Nuestro horario de atencion es de 9:00 a 18:00 \n',
            'Escribe "*volver*" para regresar al menu principal'
        ], null, null
    )

// El flujo principal va en la ultima posicion de todos los flujos
const flowPrincipal = addKeyword(palabrasClaveBienvenida)
    .addAnswer(
        [
            'Bienvenido al bot de pruebas del pipa \n', 'Ingresa la palabra clave de lo que deseas',
            '👉 "*stock*" = para buscar Titulo en nuestro inventario 📕',
            '👉 "*horario*" =  para ver horario de atencion 🕑'
        ],
        null,
        null,
        [flowSearch, flowInfo]
    )

const main = async () => {
    const adapterDB = new PostgreSQLAdapter({
        host: process.env.POSTGRES_DB_HOST,
        user: process.env.POSTGRES_DB_USER,
        database: process.env.POSTGRES_DB_NAME,
        password: process.env.POSTGRES_DB_PASSWORD,
        port: process.env.POSTGRES_DB_PORT,
    })
    // const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()
