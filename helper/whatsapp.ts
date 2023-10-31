import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { Request, RequestHandler, Response } from 'express'
import qr from 'qr-image'

const session = new Map()
const VAR = 'VAR_SESSION'
const ADMIN = '6282250170013'
let connectionStatus: string = 'Sedang cek koneksi'
let qrCode: string;

export const initWhatsApp = async() => {
    await connectToWhatsApp()
}

export const getStatus: RequestHandler = async(req: Request, res: Response) => {
    if (qrCode == null || qrCode == undefined){
        res.json({
            success: true,
            data: connectionStatus,
            message: 'Sukses menampilkan status'
        })
    } else {
        var code = qr.image(qrCode, {type: 'png'})
        res.setHeader('Content-type', 'image/png')
        code.pipe(res)
    }
}

export const sendMessage: RequestHandler = async(req: Request, res: Response) => {
    const {nama, email, whatsapp} = req.body

    //send to cust
    const messageCust = `Halo Bapak/Ibu Orangtua ${nama}, anak Bapak/Ibu melakukan pelanggaran`
    await session.get(VAR).sendMessage(`${whatsapp}@s.whatsapp.net`, {text: messageCust});

    //send to admin
    const messageAdmin = `Siswa dengan nama ${nama} melakukan pelanggaran`
    await session.get(VAR).sendMessage(`${ADMIN}@s.whatsapp.net`, {text: messageAdmin})

    res.json({
        success: true,
        data: `Anak Bapak/Ibu yaitu ${nama}`,
        message: 'Sukses'
    })
}

async function connectToWhatsApp () {
    const {state, saveCreds} = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth: state
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const {connection, lastDisconnect} = update
        
        if (update.qr){
            qrCode = update.qr
        }
        
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            connectionStatus = 'closed'
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            connectionStatus = 'connected'
            console.log('opened connection')
        }
    })
    sock.ev.on('messages.upsert',async m => {
        console.log(JSON.stringify(m, undefined, 2))

        console.log('replying to', m.messages[0].key.remoteJid)
    })

    session.set(VAR, sock)
}
// run in main file
//connectToWhatsApp()