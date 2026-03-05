export default function Bubble({ onClick }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <button
        onClick={onClick}
        className="bubble-breathe w-[60px] h-[60px] rounded-full
          bg-gradient-to-br from-violet-500 to-indigo-600
          flex items-center justify-center cursor-pointer
          transition-all duration-200"
        style={{ WebkitAppRegion: 'drag' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5.5-4 7v2H9v-2c-2.5-1.5-4-4-4-7a7 7 0 0 1 7-7z" />
          <path d="M9 22h6" />
          <path d="M10 18h4" />
        </svg>
      </button>
    </div>
  );
}
