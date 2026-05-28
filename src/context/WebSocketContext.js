import React, { createContext, useContext, useEffect, useRef } from 'react'
import { AuthContext } from './AuthContext'
import { API_URL } from '../api/config'

const NULL = '\0'

// Convierte http://host:8080/api -> ws://host:8080/ws-native
const buildWsUrl = () => {
    const base = API_URL.replace('/api', '')
    return base.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws-native'
}

// Helper: convierte string a ArrayBuffer (binary frame)
const strToBuffer = (str) => {
    const buf = new ArrayBuffer(str.length)
    const view = new Uint8Array(buf)
    for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i)
    return buf
}

// Helper: convierte ArrayBuffer a string
const bufferToStr = (buf) => {
    const view = new Uint8Array(buf)
    let str = ''
    for (let i = 0; i < view.length; i++) str += String.fromCharCode(view[i])
    return str
}

export const WebSocketContext = createContext({
    addListener: () => () => {},
})

export function WebSocketProvider({ children }) {
    const { usuario } = useContext(AuthContext)
    const wsRef = useRef(null)
    const listenersRef = useRef({})
    const subscriptionIdsRef = useRef({})
    const connectedRef = useRef(false)
    const reconnectTimerRef = useRef(null)
    const subCounter = useRef(0)

    useEffect(() => {
        if (!usuario) {
            cerrarConexion()
            return
        }
        conectar()

        return () => {
            cerrarConexion()
        }
    }, [usuario])

    const cerrarConexion = () => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current)
            reconnectTimerRef.current = null
        }
        if (wsRef.current) {
            try {
                wsRef.current.close()
            } catch (e) {}
            wsRef.current = null
        }
        connectedRef.current = false
        subscriptionIdsRef.current = {}
    }

    const enviarFrame = (str) => {
        if (wsRef.current && wsRef.current.readyState === 1) {
            wsRef.current.send(strToBuffer(str))
        }
    }

    const conectar = () => {
        const url = buildWsUrl()
        console.log('🔌 Conectando WebSocket a:', url)

        const ws = new WebSocket(url, ['v12.stomp', 'v11.stomp', 'v10.stomp'])
        ws.binaryType = 'arraybuffer'
        wsRef.current = ws

        ws.onopen = () => {
            console.log('🔵 WebSocket open, protocolo:', ws.protocol || '(empty)')
            const frame = 'CONNECT\naccept-version:1.2\nhost:/\nheart-beat:0,0\n\n' + NULL
            console.log('📤 Enviando CONNECT (binary)')
            enviarFrame(frame)
        }

        ws.onmessage = (event) => {
            let data = ''
            if (typeof event.data === 'string') {
                data = event.data
            } else if (event.data instanceof ArrayBuffer) {
                data = bufferToStr(event.data)
            }
            console.log('📥 RX:', JSON.stringify(data))
            if (data === '\n' || data === '') return

            const frames = data.split(NULL).filter(f => f.trim().length > 0)
            for (const frame of frames) {
                procesarFrame(frame)
            }
        }

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error.message || error)
        }

        ws.onclose = (event) => {
            console.log('🔴 WebSocket close:', event.code, event.reason)
            connectedRef.current = false
            wsRef.current = null
            subscriptionIdsRef.current = {}
            if (usuario) {
                reconnectTimerRef.current = setTimeout(() => {
                    console.log('🔄 Reintentando conexion WS...')
                    conectar()
                }, 5000)
            }
        }
    }

    const procesarFrame = (frame) => {
        const lines = frame.split('\n')
        const command = lines[0]

        if (command === 'CONNECTED') {
            console.log('🟢 STOMP CONNECTED')
            connectedRef.current = true
            Object.keys(listenersRef.current).forEach(topic => {
                suscribirTopic(topic)
            })
            return
        }

        if (command === 'MESSAGE') {
            const headers = {}
            let i = 1
            while (i < lines.length && lines[i] !== '') {
                const [key, ...rest] = lines[i].split(':')
                headers[key] = rest.join(':')
                i++
            }
            const body = lines.slice(i + 1).join('\n')
            const destination = headers['destination']
            try {
                const data = JSON.parse(body)
                const callbacks = listenersRef.current[destination] || []
                callbacks.forEach(cb => cb(data))
            } catch (e) {
                console.error('Error parsing MESSAGE body:', e, body)
            }
            return
        }

        if (command === 'ERROR') {
            console.error('❌ STOMP ERROR:', frame)
        }
    }

    const suscribirTopic = (topic) => {
        if (!wsRef.current || !connectedRef.current) return
        if (subscriptionIdsRef.current[topic]) return

        const id = `sub-${subCounter.current++}`
        subscriptionIdsRef.current[topic] = id
        const frame = `SUBSCRIBE\nid:${id}\ndestination:${topic}\n\n${NULL}`
        enviarFrame(frame)
        console.log('📩 Suscrito a:', topic, 'con id:', id)
    }

    const desuscribirTopic = (topic) => {
        const id = subscriptionIdsRef.current[topic]
        if (id && wsRef.current && connectedRef.current) {
            const frame = `UNSUBSCRIBE\nid:${id}\n\n${NULL}`
            enviarFrame(frame)
        }
        delete subscriptionIdsRef.current[topic]
    }

    const addListener = (topic, callback) => {
        if (!listenersRef.current[topic]) listenersRef.current[topic] = []
        listenersRef.current[topic].push(callback)

        if (connectedRef.current) {
            suscribirTopic(topic)
        }

        return () => {
            const list = listenersRef.current[topic] || []
            listenersRef.current[topic] = list.filter(cb => cb !== callback)
            if (listenersRef.current[topic].length === 0) {
                desuscribirTopic(topic)
                delete listenersRef.current[topic]
            }
        }
    }

    return (
        <WebSocketContext.Provider value={{ addListener }}>
            {children}
        </WebSocketContext.Provider>
    )
}
