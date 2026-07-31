import DeviceTable from './DeviceTable';
import Toolbar from './Toolbar';

export default function MainView() {
  return (
    <>
      <Toolbar />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <DeviceTable />
      </div>
    </>
  );
}
