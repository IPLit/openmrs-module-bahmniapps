import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { pdfjs } from "react-pdf";
import PropTypes from "prop-types";
import { Modal } from "carbon-components-react";

import { saveDocument, saveEncounter } from "./HandNotesUtils";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "./HandNotes.scss";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const MAX_PIXEL_RATIO = 2;

export function ScribblePad(props) {
  const {
    patient,
    imageNoteConceptName,
    handnoteConceptName,
    locationUuid,
    encounterTypeUuid,
    observationMapper,
    closeScribblePad,
    onSaveSuccess,
    saveObs
  } = props;

  const modalRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const lastPointRef = useRef(null);

  const [lineWidth, setLineWidth] = useState(2);
  const [lineColor, setLineColor] = useState("#000000");
  const [backgroundImages, setBackgroundImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(null);
  const [isFullScreen] = useState(false);
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({
    width: 0,
    height: 0
  });

  const pixelRatio = Math.min(
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
    MAX_PIXEL_RATIO
  );

  const drawImageOnCanvas = useCallback((imageSrc) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;

    const image = new Image();
    image.onload = () => {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const canvasAspectRatio = canvas.width / canvas.height;
      const imageAspectRatio = image.width / image.height;
      let drawWidth;
      let drawHeight;
      let offsetX;
      let offsetY;

      if (imageAspectRatio > canvasAspectRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imageAspectRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imageAspectRatio;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    };
    image.src = imageSrc;
  }, []);

  const clearCanvasOnly = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useLayoutEffect(() => {
    const updateCanvasSize = () => {
      const modal = modalRef.current
        ?.closest?.(".bx--modal")
        ?.querySelector?.(".bx--modal-container")
        || document.querySelector("#scribble-pad .bx--modal-container")
        || document.querySelector(".scribble-modal .bx--modal-container")
        || document.querySelector(".bx--modal-container");

      if (!modal) return;

      const { width, height } = modal.getBoundingClientRect();
      setCanvasDisplaySize({
        width: Math.max(1, Math.floor(width * 0.88)),
        height: Math.max(1, Math.floor(height * 0.65))
      });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    window.addEventListener("orientationchange", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      window.removeEventListener("orientationchange", updateCanvasSize);
    };
  }, []);

  useEffect(() => {
    if (!canvasDisplaySize.width || !canvasDisplaySize.height) return;

    if (
      currentImageIndex !== null &&
      backgroundImages[currentImageIndex]
    ) {
      drawImageOnCanvas(backgroundImages[currentImageIndex]);
    } else {
      clearCanvasOnly();
    }
  }, [
    backgroundImages,
    canvasDisplaySize,
    clearCanvasOnly,
    currentImageIndex,
    drawImageOnCanvas
  ]);

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const getStrokeWidth = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const coordinateScale = canvas.width / rect.width;
    const baseWidth = lineWidth * coordinateScale;

    if (event.pointerType === "pen" && event.pressure > 0) {
      return Math.max(0.8 * coordinateScale, baseWidth * (0.5 + event.pressure));
    }

    return baseWidth;
  };

  const startDrawing = (event) => {
    if (drawingRef.current || !event.isPrimary) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { desynchronized: true });
    const point = getCanvasPoint(event);

    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    activePointerIdRef.current = event.pointerId;
    lastPointRef.current = point;
    ctxRef.current = ctx;

    ctx.strokeStyle = lineColor;
    ctx.fillStyle = lineColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = getStrokeWidth(event);

    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(ctx.lineWidth / 2, 0.5), 0, Math.PI * 2);
    ctx.fill();
  };

  const drawPoint = (event) => {
    const ctx = ctxRef.current;
    const previousPoint = lastPointRef.current;
    if (!ctx || !previousPoint) return;

    const point = getCanvasPoint(event);
    const middleX = (previousPoint.x + point.x) / 2;
    const middleY = (previousPoint.y + point.y) / 2;

    ctx.beginPath();
    ctx.moveTo(previousPoint.x, previousPoint.y);
    ctx.quadraticCurveTo(
      previousPoint.x,
      previousPoint.y,
      middleX,
      middleY
    );
    ctx.lineWidth = getStrokeWidth(event);
    ctx.stroke();

    lastPointRef.current = point;
  };

  const draw = (event) => {
    if (
      !drawingRef.current ||
      event.pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    event.preventDefault();

    const nativeEvent = event.nativeEvent || event;
    const pointerEvents =
      typeof nativeEvent.getCoalescedEvents === "function"
        ? nativeEvent.getCoalescedEvents()
        : [nativeEvent];

    if (pointerEvents.length === 0) {
      drawPoint(event);
      return;
    }

    pointerEvents.forEach(drawPoint);
  };

  const stopDrawing = (event) => {
    if (event.pointerId !== activePointerIdRef.current) return;

    event.preventDefault();
    const canvas = canvasRef.current;

    if (canvas?.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    drawingRef.current = false;
    activePointerIdRef.current = null;
    lastPointRef.current = null;
    ctxRef.current = null;
  };

  const clearDrawing = () => {
    clearCanvasOnly();
    setBackgroundImages([]);
    setCurrentImageIndex(null);
  };

  const renderPdf = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = async () => {
        try {
          const pdf = await pdfjs.getDocument({ data: reader.result }).promise;
          const pages = [];

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.5 });
            const pdfCanvas = document.createElement("canvas");
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;

            await page.render({
              canvasContext: pdfCanvas.getContext("2d"),
              viewport
            }).promise;

            pages.push(pdfCanvas.toDataURL("image/png"));
          }

          resolve(pages);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });

  const readImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      const results = await Promise.all(
        files.map((file) =>
          file.type === "application/pdf"
            ? renderPdf(file)
            : readImage(file).then((image) => [image])
        )
      );
      const newImages = results.flat();

      setBackgroundImages((previousImages) => {
        const firstNewIndex = previousImages.length;
        if (currentImageIndex === null && newImages.length > 0) {
          setCurrentImageIndex(firstNewIndex);
        }
        return [...previousImages, ...newImages];
      });
    } catch (error) {
      // Preserve the existing UI; the host application can add its notification here.
      console.error("Unable to load the selected image/PDF", error);
    } finally {
      event.target.value = "";
    }
  };

  const switchImage = (index) => setCurrentImageIndex(index);

  const removeImage = (index) => {
    setBackgroundImages((previousImages) => {
      const updatedImages = previousImages.filter((_, i) => i !== index);

      setCurrentImageIndex((previousIndex) => {
        if (updatedImages.length === 0) return null;
        if (previousIndex === index) return Math.min(index, updatedImages.length - 1);
        if (previousIndex > index) return previousIndex - 1;
        return previousIndex;
      });

      return updatedImages;
    });
  };

  const save = async (dataUrl) => {
    const searchString = ";base64";
    const format = dataUrl.split(searchString)[0].split("/")[1];
    const content = dataUrl.substring(
      dataUrl.indexOf(searchString) + searchString.length
    );

    const response = await saveDocument({
      content,
      fileType: "image",
      format,
      encounterTypeName: "Consultation",
      patientUuid: patient.uuid
    });
    const imageName = response.data.url;

    if (saveObs) {
      const saveResponse = await saveEncounter(
        imageName,
        handnoteConceptName,
        imageNoteConceptName,
        observationMapper,
        {
          patientUuid: patient.uuid,
          locationUuid,
          encounterTypeUuid,
          visitType: "OPD"
        }
      );

      if (saveResponse.status === 200) {
        onSaveSuccess();
        closeScribblePad();
      }
      return;
    }

    onSaveSuccess(imageName, dataUrl);
    closeScribblePad();
  };

  const saveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    await save(canvas.toDataURL("image/png"));
  };

  const handleClose = (event) => {
    if (!event || event.which !== 27) {
      closeScribblePad();
    }
  };

  return (
    <Modal
      id="scribble-pad"
      ref={modalRef}
      open
      passiveModal
      className={`ngdialog ng-dialog-theme-default scribble-modal ${
        isFullScreen ? "modal-fullscreen" : "modal-normal"
      }`}
      onRequestClose={handleClose}
      preventCloseOnClickOutside
      modalHeading={patient.name}
    >
      <div className="scribble-pad-layout">
        <div className="scribble-pad-content">
          <div className="scribble-page-sidebar">
            <input
              type="file"
              id="imageUpload"
              onChange={handleImageUpload}
              accept="image/*,application/pdf"
              multiple
              hidden
            />
            <label htmlFor="imageUpload" className="scribble-upload-button">
              <i className="fa fa-upload" aria-hidden="true" />
              <span className="sr-only">Upload image or PDF</span>
            </label>

            <div className="scribble-page-list">
              {backgroundImages.map((image, index) => (
                <div className="scribble-page-item" key={`${index}-${image.slice(-20)}`}>
                  <button
                    type="button"
                    onClick={() => switchImage(index)}
                    className={
                      currentImageIndex === index
                        ? "scribble-page-button active"
                        : "scribble-page-button"
                    }
                  >
                    Pg {index + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="scribble-remove-button"
                    aria-label={`Remove page ${index + 1}`}
                  >
                    ×
                  </button>
                  <img
                    src={image}
                    alt={`Background page ${index + 1}`}
                    className="scribble-page-thumbnail"
                  />
                </div>
              ))}
            </div>
          </div>

          {canvasDisplaySize.width > 0 && canvasDisplaySize.height > 0 && (
            <canvas
              ref={canvasRef}
              width={Math.floor(canvasDisplaySize.width * pixelRatio)}
              height={Math.floor(canvasDisplaySize.height * pixelRatio)}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onLostPointerCapture={stopDrawing}
              onContextMenu={(event) => event.preventDefault()}
              className="scribble-canvas"
              style={{
                width: `${canvasDisplaySize.width}px`,
                height: `${canvasDisplaySize.height}px`
              }}
            />
          )}
        </div>

        <div className="scribble-controls">
          <label htmlFor="lineWidth">Line Width:</label>
          <input
            id="lineWidth"
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(event) => setLineWidth(Number(event.target.value))}
          />

          <label htmlFor="lineColor">Line Color:</label>
          <input
            id="lineColor"
            type="color"
            value={lineColor}
            onChange={(event) => setLineColor(event.target.value)}
          />

          <button type="button" onClick={clearDrawing}>
            Clear
          </button>
          <button type="button" onClick={saveCanvas}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

ScribblePad.propTypes = {
  closeScribblePad: PropTypes.func.isRequired,
  onSaveSuccess: PropTypes.func.isRequired,
  patient: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }).isRequired,
  handnoteConceptName: PropTypes.string.isRequired,
  imageNoteConceptName: PropTypes.string.isRequired,
  locationUuid: PropTypes.string.isRequired,
  encounterTypeUuid: PropTypes.string.isRequired,
  observationMapper: PropTypes.object.isRequired,
  saveObs: PropTypes.bool.isRequired
};
