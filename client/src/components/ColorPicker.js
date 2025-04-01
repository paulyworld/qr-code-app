import React, { useState, useEffect, useRef } from 'react';

const ColorPicker = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(color);
  const colorPickerRef = useRef(null);
  
  // Predefined colors
  const colorOptions = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0', '#808080',
    '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
  ];
  
  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Update current color when prop changes
  useEffect(() => {
    setCurrentColor(color);
  }, [color]);
  
  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setCurrentColor(newColor);
    onChange(newColor);
  };
  
  const selectPresetColor = (presetColor) => {
    setCurrentColor(presetColor);
    onChange(presetColor);
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={colorPickerRef}>
      <div 
        className="flex items-center cursor-pointer border border-gray-300 rounded-md p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div 
          className="w-6 h-6 rounded-sm mr-2"
          style={{ backgroundColor: currentColor }}
        />
        <span>{currentColor}</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-md p-3 shadow-lg">
          <div className="mb-2">
            <input 
              type="color" 
              value={currentColor}
              onChange={handleColorChange}
              className="w-full h-8 cursor-pointer"
            />
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {colorOptions.map((option) => (
              <div
                key={option}
                className="w-6 h-6 cursor-pointer rounded-sm border border-gray-300"
                style={{ backgroundColor: option }}
                onClick={() => selectPresetColor(option)}
                title={option}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;