import React, { useState, useRef, useEffect } from "react";

const Popover = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block">
      {/* Info Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-200 transition-colors"
        aria-label="More information"
      >
        ℹ️
      </button>

      {/* Popover Box */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900 text-gray-100 text-sm border border-gray-700 rounded-lg shadow-xl transition-opacity duration-200"
          style={{ minWidth: "250px" }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default Popover;
