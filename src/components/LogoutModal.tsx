export default function LogoutModal(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-white p-6 rounded-3xl w-4/5 max-w-xs shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            <i className="fa-solid fa-right-from-bracket"></i>
          </div>
          <h3 className="font-bold text-gray-800 text-lg">Ingin Keluar?</h3>
          <p className="text-gray-500 text-xs mt-2 mb-6 leading-relaxed">
            Sesi anda akan diakhiri dan anda harus login kembali untuk mengakses data.
          </p>
          <div className="flex gap-3">
            <button onClick={props.onClose} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition">
              Batal
            </button>
            <button onClick={props.onConfirm} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-rose-200">
              Keluar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
