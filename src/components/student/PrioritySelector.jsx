import React, { useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown, Check, AlertCircle, Info, BookOpen, Users } from 'lucide-react';

export default function PrioritySelector({ subjects = [], priorities = [], onChange }) {
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Medal emojis for priorities
  const getMedal = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  const handleMove = (currentIndex, direction) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= priorities.length) return;

    const updated = [...priorities];
    const temp = updated[currentIndex];
    updated[currentIndex] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalibrate priority numbers 1..N
    const reordered = updated.map((item, idx) => ({
      ...item,
      priority: idx + 1
    }));
    onChange(reordered);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...priorities];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    const reordered = updated.map((item, idx) => ({
      ...item,
      priority: idx + 1
    }));
    onChange(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (!subjects || subjects.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <h4 className="text-base font-bold text-gray-900">No Eligible Subjects Found</h4>
        <p className="text-xs text-gray-500 mt-1">There are no active elective subjects configured for your current regulation and semester.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-crimson-50/70 border border-crimson-200/60 rounded-xl text-xs text-crimson-950">
        <div className="flex items-center gap-2 font-medium">
          <Info className="w-4 h-4 text-crimson-700 flex-shrink-0" />
          <span>Drag items or use arrows to arrange your preferred choices.</span>
        </div>
        <div className="font-semibold text-crimson-800">
          Total Eligible Subjects: {priorities.length}
        </div>
      </div>

      <div className="space-y-3">
        {priorities.map((item, index) => {
          const subject = subjects.find(s => s.id === item.subject_id);
          if (!subject) return null;

          const isTopPriority = index === 0;

          return (
            <div
              key={subject.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 bg-white ${
                draggedIndex === index
                  ? 'border-crimson-400 shadow-lg scale-[1.01] bg-crimson-50/30'
                  : 'border-gray-200 hover:border-crimson-300 hover:shadow-md'
              } ${isTopPriority ? 'ring-2 ring-crimson-500/20 bg-gradient-to-r from-crimson-50/20 to-white' : ''}`}
            >
              {/* Drag Handle & Priority Badge */}
              <div className="flex items-center gap-3">
                <div 
                  className="cursor-grab active:cursor-grabbing p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Drag to reorder"
                >
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold shadow-sm ${
                  index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  index === 1 ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                  index === 2 ? 'bg-amber-700/10 text-amber-900 border border-amber-600/30' :
                  'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  <span className="text-lg">{getMedal(index)}</span>
                </div>

                {/* Subject Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">
                      {subject.subject_code}
                    </span>
                    <span className="text-xs font-semibold text-crimson-700">
                      Priority {index + 1}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 mt-0.5 font-display">
                    {subject.subject_name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                      <span>{subject.regulation} • Sem {subject.semester}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>Seats: <strong className="text-gray-800">{subject.seats}</strong></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Move Up / Down */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  className="p-2 rounded-lg text-gray-500 hover:text-crimson-700 hover:bg-crimson-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Move Priority Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === priorities.length - 1}
                  className="p-2 rounded-lg text-gray-500 hover:text-crimson-700 hover:bg-crimson-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Move Priority Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
