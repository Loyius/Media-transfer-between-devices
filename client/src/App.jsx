import RoomPanel from './components/RoomPanel';
import SendPanel from './components/SendPanel';
import ReceivePanel from './components/ReceivePanel';
import TextSyncPanel from './components/TextSyncPanel';
import { useTransferSession } from './hooks/useTransferSession';

function App() {
  const session = useTransferSession();

  return (
    <main className="app-shell">
      <header className="card">
        <h1>Transferencia de Midia entre Dispositivos</h1>
      </header>

      <RoomPanel session={session} />

      <section className="grid two-col">
        <SendPanel session={session} />
        <ReceivePanel session={session} />
      </section>

      <TextSyncPanel session={session} />
    </main>
  );
}

export default App;
