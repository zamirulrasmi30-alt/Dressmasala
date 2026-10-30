import React, { useState } from 'react';

export default function ShirtCustomizer() {
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [rotation, setRotation] = useState(0);
  const [patternImage, setPatternImage] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPatternImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleApply = () => {
    alert('Customization Applied Successfully!');
  };

  const presetColors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#800080', '#e67e22', '#d4af37'];

  return (
    <div
      id="customized"
      style={{
        background: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #121212 60%, #050505 100%)',
        padding: '50px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: '#ffffff',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      }}
    >
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '35px', maxWidth: '650px' }}>
        <h2 style={{ color: '#d4af37', fontSize: '30px', fontWeight: '700', marginBottom: '10px', letterSpacing: '2px', textShadow: '0 2px 10px rgba(212, 175, 55, 0.2)' }}>
          ZAREEF Custom Apparel Studio
        </h2>
        <p style={{ color: '#bbb', fontSize: '14px', lineHeight: '1.6' }}>
          Design your own signature luxury look! Choose your preferred fabric color (Default is clean white),
          upload your graphic print, and rotate to fit your style perfectly.
        </p>
      </div>

      {/* Glassmorphism T-Shirt Preview Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          margin: '0 auto 25px',
          background: 'rgba(18, 18, 18, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '24px',
          position: 'relative',
          padding: '40px 20px 30px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px rgba(212, 175, 55, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Golden glow accent stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #d4af37, #ffd87c, #d4af37, transparent)',
            opacity: '0.8',
          }}
        />

        {/* 3D Wooden Hanger Element */}
        <svg
          width="260"
          height="50"
          viewBox="0 0 500 80"
          style={{ position: 'absolute', top: 12, pointerEvents: 'none', zIndex: 2 }}
        >
          <g fill="#d4af37" opacity="0.95">
            <rect x="70" y="10" width="360" height="12" rx="6" />
            <path d="M 250 10 C 250 -20 280 -20 280 0" fill="none" stroke="#d4af37" strokeWidth="5" />
          </g>
        </svg>

        {/* T-Shirt SVG Preview with Natural Ratio */}
        <div style={{ width: '100%', maxWidth: '420px', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg
            viewBox="0 0 500 500"
            style={{
              width: '100%',
              height: '100%',
              overflow: 'visible',
              filter: 'drop-shadow(0px 15px 25px rgba(0,0,0,0.6))'
            }}
          >
            <defs>
              <clipPath id="tshirt-silhouette">
                <path d="M 160 80 Q 250 130 340 80 L 440 150 L 390 220 L 350 190 L 350 420 Q 250 435 150 420 L 150 190 L 110 220 L 60 150 Z" />
              </clipPath>

              <linearGradient id="body-shadow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
                <stop offset="25%" stopColor="#ffffff" stopOpacity="0.12" />
                <stop offset="50%" stopColor="#000000" stopOpacity="0.0" />
                <stop offset="75%" stopColor="#ffffff" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
              </linearGradient>

              <linearGradient id="vertical-crease" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                <stop offset="30%" stopColor="#000000" stopOpacity="0.0" />
                <stop offset="80%" stopColor="#000000" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            <g clipPath="url(#tshirt-silhouette)">
              {/* 1. Base Fabric Color */}
              <rect width="500" height="500" fill={selectedColor} />

              {/* 2. Uploaded Center Graphic Print */}
              {patternImage && (
                <image
                  href={patternImage}
                  x="140"
                  y="140"
                  width="220"
                  height="220"
                  preserveAspectRatio="xMidYMid meet"
                  transform={`rotate(${rotation}, 250, 250)`}
                  style={{
                    backgroundColor: 'transparent',
                    mixBlendMode: 'multiply',
                  }}
                />
              )}

              {/* 3. Realism Layer */}
              <rect width="500" height="500" fill="url(#body-shadow)" pointerEvents="none" />
              <rect width="500" height="500" fill="url(#vertical-crease)" pointerEvents="none" />

              {/* 4. Wrinkle Details */}
              <path d="M 150 190 Q 180 220 200 240" fill="none" stroke="#000000" strokeWidth="1.5" opacity="0.2" />
              <path d="M 350 190 Q 320 220 300 240" fill="none" stroke="#000000" strokeWidth="1.5" opacity="0.2" />
              <path d="M 170 390 Q 250 410 330 390" fill="none" stroke="#000000" strokeWidth="2" opacity="0.15" />
            </g>

            {/* Enhanced Gold Borders */}
            <path
              d="M 160 80 Q 250 130 340 80 L 440 150 L 390 220 L 350 190 L 350 420 Q 250 435 150 420 L 150 190 L 110 220 L 60 150 Z"
              fill="none"
              stroke="#d4af37"
              strokeWidth="2.5"
            />
            <path
              d="M 160 80 Q 250 130 340 80 Q 250 105 160 80 Z"
              fill="rgba(0,0,0,0.2)"
              stroke="#d4af37"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      {/* Polished Controls Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(18, 18, 18, 0.8)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '18px',
          padding: '22px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* 1. Image Upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            id="tshirt-file-input"
            style={{ display: 'none' }}
          />
          <label
            htmlFor="tshirt-file-input"
            style={{
              background: 'linear-gradient(135deg, #d4af37, #b89422)',
              color: '#000',
              padding: '10px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '12px',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
            }}
          >
            CHOOSE FILE
          </label>
          <span style={{ fontSize: '13px', color: '#ccc' }}>
            {patternImage ? '✓ Design Uploaded' : 'Upload your Graphic Logo'}
          </span>
        </div>

        {/* 2. Color Picker & Swatches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{
                width: '36px',
                height: '32px',
                border: '1px solid #d4af37',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: 'transparent',
              }}
            />
            <span style={{ fontSize: '13px', color: '#aaa' }}>
              Fabric Color ({selectedColor})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>Presets:</span>
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: selectedColor === color ? '2px solid #d4af37' : '1px solid #444',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedColor === color ? '0 0 8px rgba(212, 175, 55, 0.5)' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* 3. Rotation Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#aaa', minWidth: '90px' }}>
            Rotate ({rotation}°)
          </span>
          <input
            type="range"
            min="0"
            max="360"
            value={rotation}
            onChange={(e) => setRotation(e.target.value)}
            style={{ flex: 1, accentColor: '#d4af37', cursor: 'pointer' }}
          />
        </div>

        {/* 4. Apply Button */}
        <button
          onClick={handleApply}
          style={{
            background: 'linear-gradient(135deg, #d4af37, #b89422)',
            color: '#0d0d0d',
            border: 'none',
            padding: '13px',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
          }}
        >
          APPLY CUSTOMIZATION
        </button>
      </div>
    </div>
  );
}