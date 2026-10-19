import {
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../auth/security';

@WebSocketGateway({
  namespace: '/events',
  cors: { origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','), credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token = typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : '';
    const secret = process.env.JWT_SECRET;
    const user = secret && token ? verifyToken(token, secret) : null;
    if (!user) {
      client.emit('connection.error', { message: 'Unauthorized' });
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    await client.join(`tenant:${user.tenantId}`);
    client.emit('connection.ready', { connected: true, serverTime: new Date().toISOString() });
  }

  handleDisconnect(_client: Socket) {}

  publishTenantEvent(tenantId: string, event: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, payload);
  }
}
