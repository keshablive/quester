import { Certificate } from '@/core';

export interface CertificateCardProps {
    certificate: Certificate;
    onPress: (certificate: Certificate) => void;
    onDownload: (certificate: Certificate) => void;
}

export interface CertificateListProps {
    onCertificatePress: (certificate: Certificate) => void;
}
