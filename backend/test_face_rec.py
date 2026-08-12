#!/usr/bin/env python3
import sys
import os

# Adjust path to import face_utils if run from within backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import face_recognition
    import dlib
    print(f"Libraries imported successfully:")
    print(f"  dlib version: {dlib.__version__}")
    print(f"  face_recognition version: {face_recognition.__version__}")
except ImportError as err:
    print(f"ERROR: Failed to import face_recognition or dlib: {err}")
    sys.exit(1)

def test_face_recognition(img1_path, img2_path):
    if not os.path.exists(img1_path):
        print(f"ERROR: File not found: {img1_path}")
        return
    if not os.path.exists(img2_path):
        print(f"ERROR: File not found: {img2_path}")
        return

    print(f"\nLoading image 1: {img1_path}")
    image1 = face_recognition.load_image_file(img1_path)
    
    print("Detecting faces in image 1...")
    locations1 = face_recognition.face_locations(image1)
    print(f"  Found {len(locations1)} face(s) at locations: {locations1}")

    if not locations1:
        print("No faces found in image 1. Cannot proceed.")
        return

    print("Generating 128-dimensional face encoding for image 1...")
    encodings1 = face_recognition.face_encodings(image1, known_face_locations=locations1)
    encoding1 = encodings1[0]
    print(f"  Encoding generated. First 5 values: {encoding1[:5]}")

    print(f"\nLoading image 2: {img2_path}")
    image2 = face_recognition.load_image_file(img2_path)
    
    print("Detecting faces in image 2...")
    locations2 = face_recognition.face_locations(image2)
    print(f"  Found {len(locations2)} face(s) at locations: {locations2}")

    if not locations2:
        print("No faces found in image 2. Cannot proceed.")
        return

    print("Generating 128-dimensional face encoding for image 2...")
    encodings2 = face_recognition.face_encodings(image2, known_face_locations=locations2)
    encoding2 = encodings2[0]
    print(f"  Encoding generated. First 5 values: {encoding2[:5]}")

    print("\nComparing encodings...")
    distance = face_recognition.face_distance([encoding1], encoding2)[0]
    matches = face_recognition.compare_faces([encoding1], encoding2, tolerance=0.55)
    
    print(f"  Distance: {distance:.4f}")
    print(f"  Match status (tolerance=0.55): {matches[0]}")
    if matches[0]:
        print("  RESULT: Faces MATCH!")
    else:
        print("  RESULT: Faces DO NOT match.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python test_face_rec.py <image1_path> <image2_path>")
        print("Ensure you provide two valid local image paths.")
        sys.exit(1)
        
    test_face_recognition(sys.argv[1], sys.argv[2])
