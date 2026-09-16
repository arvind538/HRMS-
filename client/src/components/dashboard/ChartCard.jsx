"use client";
import {
    ResponsiveContainer,
    LineChart, Line,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["#4f46e5", "#22c55e", "#f97316", "#ef4444", "#a855f7"];

export default function ChartCard({
    title,
    data,
    type = "line",
    dataKey = "value",
    xKey = "name",
    height = 280,
}) {
    return (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {type === "line" ? (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey={dataKey} stroke="#4f46e5" strokeWidth={2} dot={false} />
                        </LineChart>
                    ) : type === "bar" ? (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey={dataKey} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    ) : (
                        <PieChart>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Pie
                                data={data}
                                dataKey={dataKey}
                                nameKey={xKey}
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                label
                            >
                                {data.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}