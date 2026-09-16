export default function EmptyModulePage({ title, description }) {
    return (
        <div>
            <h1 className="text-xl font-bold text-gray-800 mb-5">{title}</h1>
            <div className="bg-white rounded-xl border p-8 sm:p-12 text-center">
                <p className="text-gray-500 text-sm max-w-md mx-auto">{description}</p>
                <p className="text-xs text-gray-400 mt-3">
                    Backend model + API ready hote hi ye page live data ke saath connect ho jayega.
                </p>
            </div>
        </div>
    );
}