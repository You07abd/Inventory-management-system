from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_staff
from app.models.category import Category
from app.models.item import Item
from app.models.user import User
from app.schemas.category import Category as CategorySchema
from app.schemas.category import CategoryCreate, CategoryUpdate


router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategorySchema])
def list_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Category).order_by(Category.name).offset(skip).limit(limit).all()


@router.post("/", response_model=CategorySchema, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    category = Category(**payload.model_dump())
    db.add(category)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A category with this name already exists.") from exc
    db.refresh(category)
    return category


@router.get("/{category_id}", response_model=CategorySchema)
def get_category(category_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
    return category


@router.put("/{category_id}", response_model=CategorySchema)
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A category with this name already exists.") from exc
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db), _: User = Depends(require_staff)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
    db.query(Item).filter(Item.category_id == category_id).update(
        {Item.category_id: None},
        synchronize_session=False,
    )
    db.delete(category)
    db.commit()
    return None
