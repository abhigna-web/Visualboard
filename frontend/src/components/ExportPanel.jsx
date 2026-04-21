import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, FileText, Image as ImageIcon, X } from 'lucide-react';

const ExportPanel = ({ elements, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(elements));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "board-export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    onClose();
  };

  const handleExportPNG = () => {
    // A bit hacky, but grab the first canvas it finds which should be the whiteboard
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // Create an offscreen canvas to draw a white background if needed, 
    // or just export as is (transparent/dark)
    const dataURL = canvas.toDataURL('image/png');
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataURL);
    downloadAnchorNode.setAttribute("download", "board-export.png");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    onClose();
  };

  const handleExportPDF = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(dataURL, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save("board-export.pdf");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="modal-title">Export Board</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>

          <button onClick={handleExportPNG} className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
            <ImageIcon size={24} style={{ color: 'var(--accent-primary)' }} />
            <div style={{ textAlign: 'left', marginLeft: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>Download as PNG</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Best for sharing as an image</div>
            </div>
          </button>

          <button onClick={handleExportPDF} className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
            <FileText size={24} style={{ color: 'var(--accent-red)' }} />
            <div style={{ textAlign: 'left', marginLeft: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>Download as PDF</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Best for document archives</div>
            </div>
          </button>

          <button onClick={handleExportJSON} className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
            <Download size={24} style={{ color: 'var(--accent-green)' }} />
            <div style={{ textAlign: 'left', marginLeft: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>Download Data (JSON)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Raw element data for backups</div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
