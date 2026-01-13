import Spline from '@splinetool/react-spline';

export default function Background3D() {
    return (
        <div className="fixed inset-0 w-full h-full -z-10 bg-primary pointer-events-none overflow-hidden">
            {/* Dark overlay to ensure readability */}
            <div className="absolute inset-0 bg-black/40 z-[1] pointer-events-none" />

            <Spline
                scene="https://prod.spline.design/qAKTGFa5DNX2Gh7H/scene.splinecode"
                className="w-full h-full"
            />
        </div>
    );
}
