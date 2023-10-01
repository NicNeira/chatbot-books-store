require('dotenv').config()

const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const CustomPostgresAdapter = require('./postgres.adapter')


const palabrasClaveBienvenida = ['hola', 'buenas', 'volver']

const dbAdapter = new CustomPostgresAdapter({
    host: process.env.POSTGRES_DB_HOST,
    user: process.env.POSTGRES_DB_USER,
    database: process.env.POSTGRES_DB_NAME,
    password: process.env.POSTGRES_DB_PASSWORD,
    port: process.env.POSTGRES_DB_PORT
});

// !! No utilizar buttons ya que no funciona correctamente y no te devuelve ningun mensaje con el proveedor baileys 

const flowSearch = addKeyword('buscar')
    .addAnswer(['Ingresa el titulo o autor del libro que deseas buscar \n', 'o *volver* para regresar al menu principal'], { capture: true },
        async (ctx, { flowDynamic }) => {
            console.log('Se ha iniciado la busqueda del titulo: ', ctx.body);

            if (ctx.body !== 'volver' && ctx.body !== 'horario') {
                const textSearch = ctx.body;

                // Consultamos la base de datos para buscar el libro por el título
                try {
                    const result = await dbAdapter.searchBookByTitle(textSearch);
                    console.log('result.rows.lenght', result.length);

                    if (result.length > 0) {
                        // Construimos un mensaje con los resultados
                        const mensajes = result.map(libro => ({
                            body: `" ${libro.titulo}, de ${libro.autor}, Valor: $${parseInt(libro.precio)} "`
                        }));
                        await flowDynamic([{
                            body: `Si poseemos el libro: \n${mensajes.map(mensaje => mensaje.body).join(', \n ')}\nen nuestro inventario.
                            \n Escribe "*volver*" para regresar al menu principal`
                        }]);
                    } else {
                        await flowDynamic([{
                            body: `Lo siento, no pudimos encontrar el libro ${ctx.body} que estás buscando en nuestro inventario.
                            \n Escribe "*volver*" para regresar al menu principal`
                        }]);
                    }
                } catch (error) {
                    console.error('Error consultando la base de datos', error);
                    await flowDynamic([{
                        body: `Hubo un error al buscar el libro. Por favor, intenta de nuevo más tarde.
                        \n Escribe "*volver*" para regresar al menu principal`
                    }]);
                }
            }
        });

const flowInfo = addKeyword('horario')
    .addAnswer(
        [
            'Nuestro horario de atencion es de 9:00 a 18:00 \n',
            'Escribe "*volver*" para regresar al menu principal'
        ], null, null
    )

const flowAllBooks = addKeyword('todos')
    .addAnswer(['Recuperando todos los libros de la base de datos...'], null, async (ctx, { flowDynamic }) => {
        try {
            const result = await dbAdapter.getAllBooks(); // Asegúrate de tener esta función en tu adaptador
            if (result && result.length > 0) {
                const mensajes = result.map(libro => (`"${libro.titulo}, de ${libro.autor}, Valor: $${parseInt(libro.precio)}"`));
                await flowDynamic([{
                    body: `Aquí tienes todos los libros en nuestro inventario: \n${mensajes.join(', \n')} \nEscribe "*volver*" para regresar al menu principal`
                }]);
            } else {
                await flowDynamic([{
                    body: `Lo siento, no hay libros en el inventario en este momento. \nEscribe "*volver*" para regresar al menu principal`
                }]);
            }
        } catch (error) {
            console.error('Error consultando la base de datos', error);
            await flowDynamic([{
                body: `Hubo un error al recuperar los libros. Por favor, intenta de nuevo más tarde. \nEscribe "*volver*" para regresar al menu principal`
            }]);
        }
    });


// El flujo principal va en la ultima posicion de todos los flujos
const flowPrincipal = addKeyword(palabrasClaveBienvenida)
    .addAnswer(
        [
            'Bienvenido al bot de pruebas del pipa \n',
            'Ingresa la palabra clave de lo que deseas',
            '👉 " *todos* " = para ver todos los libros disponibles 📚',
            '👉 " *buscar* " = para buscar Titulo o Autor del libro en nuestro inventario 📕',
            '👉 " *horario* " =  para ver horario de atencion 🕑',

        ],
        null,
        null,
        [flowSearch, flowInfo, flowAllBooks]
    )

const main = async () => {

    // const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal, flowSearch, flowInfo, flowAllBooks])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: dbAdapter,
    })
    QRPortalWeb()
}

main()
