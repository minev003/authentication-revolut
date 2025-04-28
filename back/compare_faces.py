from deepface import DeepFace
import cv2

def compare_faces(img1_path, img2_path):
    try:
        result = DeepFace.verify(img1_path=img1_path, img2_path=img2_path)
        
        is_same_person = result["verified"]
        distance = result["distance"]

        return {
            "is_same_person": is_same_person,
            "distance": distance
        }

    except Exception as e:
        return {"error": str(e)}

def show_images(img1_path, img2_path):
    # Зареждаме снимките
    img1 = cv2.imread(img1_path)
    img2 = cv2.imread(img2_path)

    # Показваме в отделни прозорци
    cv2.imshow("Image 1", img1)
    cv2.imshow("Image 2", img2)

    # Чакаме натискане на клавиш
    cv2.waitKey(0)
    cv2.destroyAllWindows()

# ---- Сега реалната част ----
if __name__ == "__main__":

    image1 = "images/image1.jpg"   # <-- твоите реални пътища
    image2 = "images/image2.jpg"

    # Показваме снимките
    show_images(image1, image2)

    # Сравняваме снимките
    comparison = compare_faces(image1, image2)
    print(comparison)
