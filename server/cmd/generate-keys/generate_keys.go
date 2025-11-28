package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
)

func main() {
	// Create .keys directory
	if err := os.MkdirAll(".keys", 0755); err != nil {
		panic(err)
	}

	// Generate Private Key
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic(err)
	}

	privateKeyBytes := x509.MarshalPKCS1PrivateKey(privateKey)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privateKeyBytes,
	})

	if err := os.WriteFile(".keys/private.pem", privateKeyPEM, 0600); err != nil {
		panic(err)
	}
	fmt.Println("Generated .keys/private.pem")

	// Generate Public Key
	publicKey := &privateKey.PublicKey
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		panic(err)
	}

	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	})

	if err := os.WriteFile(".keys/public.pem", publicKeyPEM, 0644); err != nil {
		panic(err)
	}
	fmt.Println("Generated .keys/public.pem")
}
