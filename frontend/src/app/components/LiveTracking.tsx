import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, CheckCircle2, X, Monitor, User, Eye, MousePointer2, MoveLeft } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { AlertDialogDescription, AlertDialogTitle } from '@radix-ui/react-alert-dialog';

const CALIBRATION_POINTS = [
  { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 },
  { x: 10, y: 50 }, { x: 50, y: 50 }, { x: 90, y: 50 },
  { x: 10, y: 90 }, { x: 50, y: 90 }, { x: 90, y: 90 }
];

export function LiveTracking() {
  const { isCalibrated, setIsCalibrated } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [clickCounts, setClickCounts] = useState<Record<number, number>>({});
  const [gazePoint, setGazePoint] = useState({ x: 50, y: 50 });
  const [allPointsDone, setAllPointsDone] = useState(false);
  const CLICKS_REQUIRED = 9;

  const initWebGazer = async () => {
    const wg = (window as any).webgazer;
    if (!wg.isReady()) {
      await wg.setGazeListener((data: any) => {
        if (data) {
          const xPct = (data.x / window.innerWidth) * 100;
          const yPct = (data.y / window.innerHeight) * 100;
          setGazePoint({ x: xPct, y: yPct });
        }
      }).begin();
      wg.showVideoPreview(true).showPredictionPoints(true);
    }
    return wg;
  };

  useEffect(() => {
    if (allPointsDone) {
      const wg = (window as any).webgazer;
      setIsCalibrating(false);
      setIsCalibrated(true);
      setAllPointsDone(false);
      
      if (wg) {
        wg.showPredictionPoints(false);
        wg.showVideoPreview(false);
        wg.showVideo(false);
        wg.showFaceFeedbackBox(false);
        wg.showFaceOverlay(false);
        wg.pause();
      }
      toast.success("Calibration Successful!");
    }
  }, [allPointsDone, setIsCalibrated]);

  const handleStartCalibration = async () => {
    let wg = (window as any).webgazer;
    
    if (isCalibrated || wg.isReady()) {
      await wg.resume();
    } else {
      wg = await initWebGazer();
    }
    
    setIsCalibrating(true);
    setIsCalibrated(false);
    setClickCounts({});

    const webgazerVideoContainer = document.getElementById('webgazerVideoContainer'); 
    if (webgazerVideoContainer && webgazerVideoContainer.parentElement !== document.body) {
        document.body.appendChild(webgazerVideoContainer);
        webgazerVideoContainer.style.position = 'fixed';
    }
    
    wg.showPredictionPoints(true);
    wg.showVideoPreview(true);
    wg.showVideo(true);
    wg.showFaceFeedbackBox(true);
    wg.showFaceOverlay(true);
  };

  const handleCalibrationClick = (index: number) => {
    const wg = (window as any).webgazer;
    const point = CALIBRATION_POINTS[index];
    
    wg.recordScreenPosition(
      window.innerWidth * (point.x / 100),
      window.innerHeight * (point.y / 100),
      'click'
    );

    setClickCounts(prev => {
      const newCounts = { ...prev, [index]: (prev[index] || 0) + 1 };
      const completedPoints = Object.values(newCounts).filter(count => count >= CLICKS_REQUIRED).length;

      if (completedPoints === CALIBRATION_POINTS.length) {
        setAllPointsDone(true);
      }
      return newCounts;
    });
  };

  const toggleTracking = async () => {
    const wg = (window as any).webgazer;
    const webgazerVideoContainer = document.getElementById('webgazerVideoContainer'); 
    
    if (!isTracking) {
      await initWebGazer();
      
      if (webgazerVideoContainer) {
        const cameraContainer = document.getElementById('cameraContainer');
        if (cameraContainer) {
          cameraContainer.appendChild(webgazerVideoContainer);
          webgazerVideoContainer.style.position = 'relative';
          webgazerVideoContainer.style.top = '0';
          webgazerVideoContainer.style.left = '0';
        }
      }

      wg.resume();
      setIsTracking(true);
      wg.showPredictionPoints(true);
      wg.showVideoPreview(true);
    } else {
      if (webgazerVideoContainer) {
          document.body.appendChild(webgazerVideoContainer);
          webgazerVideoContainer.style.position = 'fixed';
      }

      wg.pause();
      setIsTracking(false);
      wg.showPredictionPoints(false);
      wg.showVideoPreview(false);
    }
  };

  useEffect(() => {
    return () => {
      const wg = (window as any).webgazer;
      if (wg) {
        wg.pause();
        const container = document.getElementById('webgazerVideoContainer');
        if (container && container.parentElement !== document.body){
          document.body.appendChild(container);
        }
      }
    };
  }, []);

  return (
    <div className="space-y-6 relative">
      <AlertDialog open={isInstructionModalOpen} onOpenChange={setIsInstructionModalOpen}>
        <AlertDialogContent className="!max-w-4xl bg-indigo-100/95 backdrop-blur-xl border-slate-700 text-white p-0 overflow-hidden shadow-2xl">
            <AlertDialogHeader className="sr-only">
                <AlertDialogTitle>Calibration Instructions</AlertDialogTitle>
                <AlertDialogDescription>
                    Follow the dots on the screen and click each one nine times to calibrate the eye tracker.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <Button 
                onClick={() => setIsInstructionModalOpen(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
                <X className="w-8 h-8" />
            </Button>

            <div className="flex flex-col items-center justify-center py-16 px-8 space-y-16">
                <h2 className="text-5xl font-bold text-violet-700 tracking-tight">Calibration</h2>   
                <div className="flex items-center justify-center gap-12 md:gap-24 w-full">
                    <div className="relative group">
                        <Monitor strokeWidth={1.5} className="w-32 h-32 text-slate-600" />
                        <div className="absolute inset-0 flex items-center justify-center pb-2">
                             <User strokeWidth={1.5} className="w-16 h-16 text-slate-400" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-600 shadow-[0_0_20px_rgba(75, 0, 130, 1.0)]" />
                        <MoveLeft className="w-8 h-8 text-slate-500 animate-pulse dashed" style={{ strokeDasharray: "4 4" }} />
                        <div className="flex gap-1">
                            <div className="bg-white rounded-full p-1"><Eye className="w-8 h-8 text-slate-900 fill-slate-900" /></div>
                            <div className="bg-white rounded-full p-1"><Eye className="w-8 h-8 text-slate-900 fill-slate-900" /></div>
                        </div>
                    </div>

                    <div className="relative flex items-center">
                         
                        <div className="absolute -left-8 w-12 h-12 rounded-full bg-indigo-700/20" />
                        <div className="abs olute -left-4 w-12 h-12 rounded-full bg-indigo-700/40" />
                        <div className="w-14 h-14 rounded-full bg-indigo-600 shadow-[0_0_20px_rgba(75, 0, 130, 1.0)] flex items-center justify-center z-10">
                            <MousePointer2 className="w-8 h-8 text-white fill-white absolute -bottom-4 -right-4 drop-shadow-md" />
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-3">
                    <p className="text-xl text-slate-900">Make sure your whole face is visible in the camera.</p>
                    <p className="text-xl text-slate-900">Follow the dots with your eyes and click to calibrate.</p>
                </div>

                <Button 
                    size="lg"
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-lg px-12 py-6 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all hover:scale-105"
                    onClick={() => {
                        setIsInstructionModalOpen(false);
                        handleStartCalibration();
                    }}
                >
                    Start Calibration
                </Button>
            </div>
        </AlertDialogContent>
      </AlertDialog>

      {isCalibrating && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 cursor-crosshair">
          {CALIBRATION_POINTS.map((point, index) => {
            const clicks = clickCounts[index] || 0;
            const isDone = clicks >= CLICKS_REQUIRED;
            const peripheralDoneCount = CALIBRATION_POINTS.reduce((acc, _, i) => 
              i !== 4 && (clickCounts[i] || 0) >= CLICKS_REQUIRED ? acc + 1 : acc, 0
            );

            const isMiddleDot = index === 4;
            const shouldShow = !isMiddleDot || peripheralDoneCount === 8;

            if (!shouldShow) return null;

            return (
              <Button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCalibrationClick(index);
                }}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  position: 'absolute',
                  transform: 'translate(-50%, -50%)',
                }}
                className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center transition-all duration-200 ${
                  isDone 
                    ? 'bg-green-500 opacity-0 scale-50' 
                    : 'bg-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.8)] animate-pulse hover:scale-125'
                }`}
              >
                {!isDone && <div className="w-2 h-2 bg-white rounded-full" />}
              </Button>
            );
          })}
          
          <div className="absolute top-3/4 left-1/2 -translate-x-1/2 pointer-events-none text-center space-y-2">
             <h3 className="text-3xl font-bold text-white drop-shadow-lg">Calibration in Progress</h3>
             <p className="text-cyan-200 text-lg bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm">
                Look at the dot and click it {CLICKS_REQUIRED} times
             </p>
          </div>
      </div>,document.body
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl text-white font-bold">Live Eye Tracking</h2>
          <p className="text-gray-400 mt-1">Real-time gaze tracking and calibration</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsInstructionModalOpen(true)}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Calibrate
          </Button>
          <Button
            onClick={toggleTracking}
            disabled={!isCalibrated}
            className={`${
              isTracking ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-600'
            } text-white`}
          >
            {isTracking ? <><Pause className="w-4 h-4 mr-2" /> Stop Tracking</> : <><Play className="w-4 h-4 mr-2" /> Start Tracking</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white/5 border-white/10 p-6 overflow-hidden">
          <div className="relative aspect-video bg-slate-900/50 rounded-lg overflow-hidden border border-white/5">
             <div className="absolute inset-0 flex items-center justify-center text-white/20" id="cameraContainer">
                {!isTracking && !isCalibrating && <p>Camera Preview Area</p>}
             </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="bg-white/5 border-white/10 p-4">
            <h3 className="text-white mb-4 font-medium">Calibration Status</h3>
            <div className="flex items-center space-x-2">
              {isCalibrated ? (
                <><CheckCircle2 className="w-5 h-5 text-green-400" /><span className="text-green-400">Calibrated</span></>
              ) : (
                <><div className="w-5 h-5 rounded-full border-2 border-gray-400" /><span className="text-gray-400">Not Calibrated</span></>
              )}
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <h3 className="text-white mb-4 font-medium">Gaze Coordinates</h3>
            <div className="space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-gray-400">X:</span>
                <span className="text-cyan-400">{gazePoint.x.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-gray-400">Y:</span>
                <span className="text-cyan-400">{gazePoint.y.toFixed(1)}%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}