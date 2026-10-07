interface Props {
    id: string;
    data: Record<string, unknown>;
}

const serializeStructuredData = (data: Record<string, unknown>) =>
    JSON.stringify(data).replace(/</g, '\\u003c');

const StructuredData = ({ id, data }: Props) => (
    <script
        id={`structured-data-${id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}
    />
);

export default StructuredData;
