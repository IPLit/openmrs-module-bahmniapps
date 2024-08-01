import React, { useState, useRef, useEffect } from 'react';
import { pdfjs } from 'react-pdf';
import PropTypes from "prop-types";

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import './HandNotes.scss';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export function ScribblePad(props) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineWidth, setLineWidth] = useState(2);
  const [lineColor, setLineColor] = useState('#000000');
  const [backgroundImages, setBackgroundImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(null);
  const [pdfPages, setPdfPages] = useState({});
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setCanvasWidth(window.innerWidth - 40); // Adjusted for some padding
      setCanvasHeight(window.innerHeight - 250); // Adjusted for the top and bottom controls
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFullScreen = () => {
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((err) => {
        alert(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.exitFullscreen();
      document.documentElement.style.overflow = '';
    }
  };

  const startDrawing = (event) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctxRef.current = ctx;

    const x = event.type === 'mousedown' ? event.nativeEvent.offsetX : event.touches[0].clientX - canvas.getBoundingClientRect().left;
    const y = event.type === 'mousedown' ? event.nativeEvent.offsetY : event.touches[0].clientY - canvas.getBoundingClientRect().top;
    ctx.beginPath();
    ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
    setIsDrawing(true);
  };

  const draw = (event) => {
    if (!isDrawing) return;
    const ctx = ctxRef.current;
    const x = event.type === 'mousemove' ? event.nativeEvent.offsetX : event.touches[0].clientX - canvasRef.current.getBoundingClientRect().left;
    const y = event.type === 'mousemove' ? event.nativeEvent.offsetY : event.touches[0].clientY - canvasRef.current.getBoundingClientRect().top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleLineWidthChange = (event) => {
    setLineWidth(parseInt(event.target.value));
  };

  const handleColorChange = (event) => {
    setLineColor(event.target.value);
  };

  const handleImageUpload = (event) => {
    const files = event.target.files;
    const images = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf') {
        renderPdf(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          images.push(reader.result);
          if (images.length === files.length) {
            setBackgroundImages((prevImages) => [...prevImages, ...images]);
            if (currentImageIndex === null) {
              setCurrentImageIndex(0);
              drawImageOnCanvas(images[0]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const renderPdf = (file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const pdf = await pdfjs.getDocument({ data: reader.result }).promise;
      const pages = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        await page.render(renderContext).promise;
        pages.push(canvas.toDataURL());
      }
      setPdfPages((prevPages) => ({ ...prevPages, [file.name]: pages }));
      setBackgroundImages((prevImages) => [...prevImages, ...pages]);
      if (currentImageIndex === null) {
        setCurrentImageIndex(0);
        drawImageOnCanvas(pages[0]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const switchImage = (index) => {
    setCurrentImageIndex(index);
    clearDrawing();
    drawImageOnCanvas(backgroundImages[index]);
  };

  const removeImage = (index) => {
    setBackgroundImages((prevImages) => {
      const updatedImages = prevImages.filter((_, i) => i !== index);
      if (index === currentImageIndex) {
        setCurrentImageIndex(updatedImages.length > 0 ? 0 : null);
        if (updatedImages.length > 0) {
          drawImageOnCanvas(updatedImages[0]);
        } else {
          clearDrawing();
        }
      } else if (index < currentImageIndex) {
        setCurrentImageIndex((prevIndex) => prevIndex - 1);
      }
      return updatedImages;
    });
  };

  const drawImageOnCanvas = (imageSrc) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const mergedCanvas = document.createElement('canvas');
    const mergedCtx = mergedCanvas.getContext('2d');
    mergedCanvas.width = canvas.width;
    mergedCanvas.height = canvas.height;
    if (backgroundImages[currentImageIndex]) {
      const image = new Image();
      image.src = backgroundImages[currentImageIndex];
      image.onload = () => {
        mergedCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
        mergedCtx.drawImage(canvas, 0, 0);
        mergedCanvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'scribble_with_image.png';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        });
      };
    } else {
      mergedCtx.drawImage(canvas, 0, 0);
      mergedCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scribble.png';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
    }
  };

  const printCanvas = () => {
    const canvas = canvasRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Canvas</title>
          <style>
            canvas {
              border: 1px solid #000;
              background-color: white;
            }
          </style>
        </head>
        <body>
          <h1>Scribble Pad</h1>
          <canvas id="printCanvas" width="${canvas.width}" height="${canvas.height}"></canvas>
          <script>
            const canvas = document.getElementById('printCanvas');
            const ctx = canvas.getContext('2d');
            const backgroundImage = new Image();
            backgroundImage.src = '${backgroundImages[currentImageIndex]}';
            backgroundImage.onload = () => {
              ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
              const originalCanvas = window.opener.document.querySelector('canvas');
              const originalCtx = originalCanvas.getContext('2d');
              ctx.drawImage(originalCanvas, 0, 0, canvas.width, canvas.height);
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const nextPage = () => {
    if (pdfPages[currentImageIndex] && currentPdfPage < pdfPages[currentImageIndex].length) {
      setCurrentPdfPage(currentPdfPage + 1);
      drawImageOnCanvas(pdfPages[currentImageIndex][currentPdfPage]);
    }
  };

  const prevPage = () => {
    if (pdfPages[currentImageIndex] && currentPdfPage > 1) {
      setCurrentPdfPage(currentPdfPage - 1);
      drawImageOnCanvas(pdfPages[currentImageIndex][currentPdfPage - 2]);
    }
  };

  useEffect(() => {
    if (currentImageIndex !== null && backgroundImages[currentImageIndex]) {
      drawImageOnCanvas(backgroundImages[currentImageIndex]);
    }
  }, [currentImageIndex, backgroundImages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100vh' }}>
      <button style={{ position: 'absolute', top: '10px', right: '10px', padding: '8px 16px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', zIndex: 1000 }} onClick={toggleFullScreen}>Enter Full Screen</button>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Scribble Pad</h1>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'start', flexGrow: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '20px', maxHeight: '400px', overflowY: 'auto' }}>
          <input type="file" id="imageUpload" onChange={handleImageUpload} accept="image/*,application/pdf" multiple style={{ display: 'none' }} />
          <label htmlFor="imageUpload" style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', zIndex: 1000 }}>Upload Images/PDFs</label>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {backgroundImages.map((image, index) => (
              <div key={index} style={{ position: 'relative', marginBottom: '10px' }}>
                <button onClick={() => switchImage(index)} style={{ position: 'relative', padding: '8px 16px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', zIndex: 1000 }}>
                  Pg {index + 1}
                </button>
                <button onClick={() => removeImage(index)} style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  backgroundColor: 'red',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}>x</button>
                <img src={image} alt={`Background ${index + 1}`} style={{ display: 'block', marginTop: '10px', maxWidth: '150px', border: '1px solid #000' }} />
              </div>
            ))}
          </div>
          {pdfPages[currentImageIndex] && (
            <div style={{ marginTop: '10px' }}>
              <button onClick={prevPage} style={{ padding: '8px 16px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>Previous Page</button>
              <button onClick={nextPage} style={{ padding: '8px 16px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Next Page</button>
            </div>
          )}
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ border: '1px solid #000', backgroundColor: 'white', cursor: 'crosshair' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', width: '100%', position: 'absolute', bottom: 0 }}>
        <label htmlFor="lineWidth" style={{ marginRight: '10px' }}>Line Width: </label>
        <input id="lineWidth" type="range" min="1" max="10" value={lineWidth} onChange={handleLineWidthChange} style={{ marginRight: '20px' }} />
        <label htmlFor="lineColor" style={{ marginRight: '10px' }}>Line Color: </label>
        <input id="lineColor" type="color" value={lineColor} onChange={handleColorChange} style={{ marginRight: '20px' }} />
        <button onClick={clearDrawing} style={{ marginRight: '10px', padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
        <button onClick={saveCanvas} style={{ marginRight: '10px', padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
        <button onClick={printCanvas} style={{ padding: '8px 16px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Print</button>
      </div>
    </div>
  );
}

ScribblePad.propTypes = {
    hostData: PropTypes.Object,
}

